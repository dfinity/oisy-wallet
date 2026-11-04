//! What `btc_broadcast_transaction` knows about each transaction it reserved, so that a request
//! with the same txid neither pays for a broadcast that already went out nor races one still in
//! flight.
//!
//! The states live in heap memory, not stable memory, so an upgrade clears them. That allows at
//! most `MAX_BROADCAST_ATTEMPTS` more paid broadcasts of a transaction whose inputs are still in
//! the UTXO view, and releases nothing: a resend after the upgrade finds its reservation, reuses
//! it, and so keeps it whatever the answer. A state is dropped with its reservation, so there are
//! never more states than reservations.

use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

use candid::Principal;
use ic_cdk_bitcoin_canister::Utxo;
use shared::types::bitcoin::{BtcBroadcastTransactionError, StoredPendingTransaction};

use super::pending_tx_model::BtcUserPendingTransactionsModel;

/// The paid broadcasts of one transaction after which an unclear outcome is final until the usual
/// prune releases the reservation.
pub const MAX_BROADCAST_ATTEMPTS: u8 = 3;

/// `attempts` counts the paid broadcasts so far.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BtcBroadcastState {
    InFlight { attempts: u8 },
    Sent,
    Unknown { attempts: u8 },
}

#[derive(Debug, Default)]
pub struct BtcBroadcastStates(HashMap<(Principal, [u8; 32]), BtcBroadcastState>);

thread_local! {
    static BTC_BROADCAST_STATES: RefCell<BtcBroadcastStates> = RefCell::default();
}

pub fn with_btc_broadcast_states<R>(f: impl FnOnce(&mut BtcBroadcastStates) -> R) -> R {
    BTC_BROADCAST_STATES.with(|states| f(&mut states.borrow_mut()))
}

/// Drops the states of the principal's transactions that are no longer reserved. Call it after
/// every prune.
pub fn retain_reserved_broadcasts(
    pending: &BtcUserPendingTransactionsModel<'_>,
    principal: Principal,
) {
    let reserved = pending.pending_txids(principal);
    with_btc_broadcast_states(|states| states.retain_reserved(principal, &reserved));
}

impl BtcBroadcastStates {
    /// The answer to a request for `txid` that needs neither the UTXOs nor a paid call: the txid
    /// of a transaction already sent, or `BroadcastInProgress`.
    pub fn settled_answer(
        &self,
        principal: Principal,
        txid: &[u8; 32],
    ) -> Option<Result<(), BtcBroadcastTransactionError>> {
        match self.0.get(&(principal, *txid))? {
            BtcBroadcastState::Sent => Some(Ok(())),
            BtcBroadcastState::InFlight { .. } => {
                Some(Err(BtcBroadcastTransactionError::BroadcastInProgress))
            }
            BtcBroadcastState::Unknown { .. } => None,
        }
    }

    pub fn retain_reserved(&mut self, principal: Principal, reserved_txids: &HashSet<Vec<u8>>) {
        self.0.retain(|(state_principal, txid), _| {
            *state_principal != principal || reserved_txids.contains(txid.as_slice())
        });
    }

    fn get(&self, principal: Principal, txid: &[u8; 32]) -> Option<BtcBroadcastState> {
        self.0.get(&(principal, *txid)).copied()
    }

    fn set(&mut self, principal: Principal, txid: [u8; 32], state: BtcBroadcastState) {
        self.0.insert((principal, txid), state);
    }

    fn remove(&mut self, principal: Principal, txid: &[u8; 32]) {
        self.0.remove(&(principal, *txid));
    }
}

/// Whether the attempt took a new reservation or found the transaction's own, from an earlier
/// attempt or from `btc_add_pending_transaction`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Reservation {
    Inserted,
    Reused,
}

/// The paid broadcast `begin_broadcast` cleared to go ahead.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BroadcastAttempt {
    pub reservation: Reservation,
    pub attempts: u8,
}

/// What a `bitcoin_send_transaction` call says about whether the transaction went out.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum BroadcastOutcome {
    Sent,
    /// Nothing went out: the call was never made, or the Bitcoin canister refused it before
    /// queueing it.
    Refused {
        msg: String,
    },
    /// It may have gone out.
    Unknown {
        msg: String,
    },
}

/// Reserves the transaction's inputs, or reuses its own reservation, and claims the next paid
/// broadcast. Runs in one synchronous block after the prune, so no other call interleaves between
/// the checks and the writes.
///
/// Returns `None` when the transaction was already sent, so nothing is to be paid for.
///
/// # Errors
/// `BroadcastInProgress`, `BroadcastOutcomeUnknown` once `MAX_BROADCAST_ATTEMPTS` are used,
/// `UtxosAlreadyReserved`, or `InternalError` when the reservation cannot be stored.
pub fn begin_broadcast(
    pending: &mut BtcUserPendingTransactionsModel<'_>,
    states: &mut BtcBroadcastStates,
    principal: Principal,
    address: &str,
    txid: [u8; 32],
    utxos: Vec<Utxo>,
    reserved_at_ns: u64,
) -> Result<Option<BroadcastAttempt>, BtcBroadcastTransactionError> {
    states.retain_reserved(principal, &pending.pending_txids(principal));

    let attempts = match states.get(principal, &txid) {
        None => 1,
        Some(BtcBroadcastState::Sent) => return Ok(None),
        Some(BtcBroadcastState::InFlight { .. }) => {
            return Err(BtcBroadcastTransactionError::BroadcastInProgress)
        }
        Some(BtcBroadcastState::Unknown { attempts }) if attempts >= MAX_BROADCAST_ATTEMPTS => {
            return Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown {
                msg: format!("Already broadcast {attempts} times without a clear outcome"),
            })
        }
        Some(BtcBroadcastState::Unknown { attempts }) => attempts + 1,
    };

    let reservation = if pending.has_same_txid_reservation(principal, &txid, &utxos) {
        Reservation::Reused
    } else if pending.has_intersecting_pending_utxos(principal, &utxos) {
        return Err(BtcBroadcastTransactionError::UtxosAlreadyReserved);
    } else {
        pending
            .add_pending_transaction(
                principal,
                address.to_string(),
                StoredPendingTransaction {
                    txid: txid.to_vec(),
                    utxos,
                    created_at_timestamp_ns: reserved_at_ns,
                },
            )
            .map_err(|msg| BtcBroadcastTransactionError::InternalError { msg })?;
        Reservation::Inserted
    };

    states.set(principal, txid, BtcBroadcastState::InFlight { attempts });
    Ok(Some(BroadcastAttempt {
        reservation,
        attempts,
    }))
}

/// Records the outcome of the attempt `begin_broadcast` cleared.
///
/// A refusal releases the reservation only if this attempt inserted it. A reused reservation is
/// older than this attempt, and something under it may have gone out: an earlier attempt, one
/// from before an upgrade cleared the states, or a transaction handed to a third party after
/// `btc_add_pending_transaction`. So `BroadcastRejected` means nothing for this txid can have gone
/// out while it was reserved.
///
/// # Errors
/// `BroadcastRejected` or `BroadcastOutcomeUnknown`.
pub fn finish_broadcast(
    pending: &mut BtcUserPendingTransactionsModel<'_>,
    states: &mut BtcBroadcastStates,
    principal: Principal,
    address: &str,
    txid: [u8; 32],
    attempt: BroadcastAttempt,
    outcome: BroadcastOutcome,
) -> Result<(), BtcBroadcastTransactionError> {
    match (outcome, attempt.reservation) {
        (BroadcastOutcome::Sent, _) => {
            states.set(principal, txid, BtcBroadcastState::Sent);
            Ok(())
        }
        (BroadcastOutcome::Refused { msg }, Reservation::Inserted) => {
            pending.remove_pending_transaction(principal, address, &txid);
            states.remove(principal, &txid);
            Err(BtcBroadcastTransactionError::BroadcastRejected { msg })
        }
        (BroadcastOutcome::Refused { msg } | BroadcastOutcome::Unknown { msg }, _) => {
            states.set(
                principal,
                txid,
                BtcBroadcastState::Unknown {
                    attempts: attempt.attempts,
                },
            );
            Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown { msg })
        }
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::Principal;
    use ic_cdk_bitcoin_canister::{OutPoint, Txid, Utxo};
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::bitcoin::{BtcBroadcastTransactionError, StoredPendingTransaction};

    use super::{
        begin_broadcast, finish_broadcast, BroadcastAttempt, BroadcastOutcome, BtcBroadcastState,
        BtcBroadcastStates, Reservation, MAX_BROADCAST_ATTEMPTS,
    };
    use crate::{
        bitcoin::pending_tx_model::BtcUserPendingTransactionsModel,
        types::BtcUserPendingTransactionsMap,
    };

    const ADDRESS: &str = "bc1q-caller";
    const TXID: [u8; 32] = [0x77; 32];
    const OTHER_TXID: [u8; 32] = [0x88; 32];
    const RESERVED_AT_NS: u64 = 1_000;

    fn principal() -> Principal {
        Principal::from_text("7blps-itamd-lzszp-7lbda-4nngn-fev5u-2jvpn-6y3ap-eunp7-kz57e-fqe")
            .unwrap()
    }

    fn utxos() -> Vec<Utxo> {
        (0..2)
            .map(|vout| Utxo {
                outpoint: OutPoint {
                    txid: Txid::from([0x11; 32]),
                    vout,
                },
                value: 10_000,
                height: 100,
            })
            .collect()
    }

    fn setup() -> (
        BtcUserPendingTransactionsMap,
        RefCell<MemoryManager<DefaultMemoryImpl>>,
    ) {
        let memory_manager = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let map =
            BtcUserPendingTransactionsMap::init(memory_manager.borrow().get(MemoryId::new(0)));
        (map, memory_manager)
    }

    fn begin(
        pending: &mut BtcUserPendingTransactionsModel<'_>,
        states: &mut BtcBroadcastStates,
        txid: [u8; 32],
    ) -> Result<Option<BroadcastAttempt>, BtcBroadcastTransactionError> {
        begin_broadcast(
            pending,
            states,
            principal(),
            ADDRESS,
            txid,
            utxos(),
            RESERVED_AT_NS,
        )
    }

    fn finish(
        pending: &mut BtcUserPendingTransactionsModel<'_>,
        states: &mut BtcBroadcastStates,
        attempt: BroadcastAttempt,
        outcome: BroadcastOutcome,
    ) -> Result<(), BtcBroadcastTransactionError> {
        finish_broadcast(
            pending,
            states,
            principal(),
            ADDRESS,
            TXID,
            attempt,
            outcome,
        )
    }

    fn refused() -> BroadcastOutcome {
        BroadcastOutcome::Refused {
            msg: "refused".to_string(),
        }
    }

    fn unknown() -> BroadcastOutcome {
        BroadcastOutcome::Unknown {
            msg: "unknown".to_string(),
        }
    }

    fn reserved_txids(pending: &BtcUserPendingTransactionsModel<'_>) -> Vec<Vec<u8>> {
        pending.pending_txids(principal()).into_iter().collect()
    }

    #[test]
    fn a_first_attempt_reserves_and_a_sent_one_is_kept() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();

        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        assert_eq!(
            attempt,
            BroadcastAttempt {
                reservation: Reservation::Inserted,
                attempts: 1
            }
        );
        assert_eq!(
            pending.get_pending_transactions(&principal(), ADDRESS),
            vec![StoredPendingTransaction {
                txid: TXID.to_vec(),
                utxos: utxos(),
                created_at_timestamp_ns: RESERVED_AT_NS,
            }]
        );

        assert_eq!(
            finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent),
            Ok(())
        );
        assert_eq!(reserved_txids(&pending), vec![TXID.to_vec()]);
    }

    #[test]
    fn a_retry_after_sent_pays_nothing_even_once_its_inputs_left_the_utxo_view() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent).unwrap();

        // Answered before the UTXO fetch, so the inputs' absence from the view never matters.
        assert_eq!(states.settled_answer(principal(), &TXID), Some(Ok(())));
        assert_eq!(begin(&mut pending, &mut states, TXID), Ok(None));
    }

    #[test]
    fn a_rejected_attempt_releases_its_reservation_while_a_concurrent_one_waits() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let first = begin(&mut pending, &mut states, TXID).unwrap().unwrap();

        // A second request for the same transaction never reaches a paid call while the first
        // is in flight, so it cannot rely on the reservation the first one may release.
        assert_eq!(
            states.settled_answer(principal(), &TXID),
            Some(Err(BtcBroadcastTransactionError::BroadcastInProgress))
        );
        assert_eq!(
            begin(&mut pending, &mut states, TXID),
            Err(BtcBroadcastTransactionError::BroadcastInProgress)
        );

        assert_eq!(
            finish(&mut pending, &mut states, first, refused()),
            Err(BtcBroadcastTransactionError::BroadcastRejected {
                msg: "refused".to_string()
            })
        );
        assert_eq!(reserved_txids(&pending), Vec::<Vec<u8>>::new());
        assert_eq!(states.settled_answer(principal(), &TXID), None);

        assert_eq!(
            begin(&mut pending, &mut states, TXID).unwrap(),
            Some(BroadcastAttempt {
                reservation: Reservation::Inserted,
                attempts: 1
            })
        );
    }

    #[test]
    fn a_rejected_retry_after_an_unknown_outcome_keeps_the_reservation() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let first = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        assert_eq!(
            finish(&mut pending, &mut states, first, unknown()),
            Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown {
                msg: "unknown".to_string()
            })
        );

        let retry = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        assert_eq!(
            retry,
            BroadcastAttempt {
                reservation: Reservation::Reused,
                attempts: 2
            }
        );
        assert_eq!(
            finish(&mut pending, &mut states, retry, refused()),
            Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown {
                msg: "refused".to_string()
            })
        );
        assert_eq!(reserved_txids(&pending), vec![TXID.to_vec()]);
    }

    #[test]
    fn a_rejected_resend_that_finds_its_reservation_but_no_state_keeps_it() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        // As after an upgrade, or after `btc_add_pending_transaction`: reserved, no state.
        pending
            .add_pending_transaction(
                principal(),
                ADDRESS.to_string(),
                StoredPendingTransaction {
                    txid: TXID.to_vec(),
                    utxos: utxos(),
                    created_at_timestamp_ns: 1,
                },
            )
            .unwrap();
        let mut states = BtcBroadcastStates::default();

        let resend = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        assert_eq!(
            resend,
            BroadcastAttempt {
                reservation: Reservation::Reused,
                attempts: 1
            }
        );
        assert_eq!(
            finish(&mut pending, &mut states, resend, refused()),
            Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown {
                msg: "refused".to_string()
            })
        );
        assert_eq!(
            pending.get_pending_transactions(&principal(), ADDRESS)[0].created_at_timestamp_ns,
            1,
            "the older reservation is kept as it was"
        );
    }

    #[test]
    fn stops_paying_after_max_broadcast_attempts() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        for attempts in 1..=MAX_BROADCAST_ATTEMPTS {
            let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
            assert_eq!(attempt.attempts, attempts);
            finish(&mut pending, &mut states, attempt, unknown()).unwrap_err();
        }

        assert!(matches!(
            begin(&mut pending, &mut states, TXID),
            Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown { .. })
        ));
        assert_eq!(
            states.settled_answer(principal(), &TXID),
            None,
            "an exhausted transaction still goes through the checks, then is refused"
        );
        assert_eq!(reserved_txids(&pending), vec![TXID.to_vec()]);
    }

    #[test]
    fn another_txid_over_a_reserved_input_is_refused_without_a_state() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        finish(&mut pending, &mut states, attempt, unknown()).unwrap_err();

        assert_eq!(
            begin(&mut pending, &mut states, OTHER_TXID),
            Err(BtcBroadcastTransactionError::UtxosAlreadyReserved)
        );
        assert_eq!(states.settled_answer(principal(), &OTHER_TXID), None);
        assert_eq!(reserved_txids(&pending), vec![TXID.to_vec()]);
    }

    #[test]
    fn a_state_is_dropped_with_its_reservation() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent).unwrap();

        // As the prune does once the reservation expired.
        pending.remove_pending_transaction(principal(), ADDRESS, &TXID);
        states.retain_reserved(principal(), &pending.pending_txids(principal()));

        assert_eq!(states.settled_answer(principal(), &TXID), None);
        assert_eq!(
            begin(&mut pending, &mut states, TXID).unwrap(),
            Some(BroadcastAttempt {
                reservation: Reservation::Inserted,
                attempts: 1
            })
        );
    }

    #[test]
    fn states_are_kept_per_principal() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent).unwrap();

        let other =
            Principal::from_text("xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae")
                .unwrap();
        states.retain_reserved(other, &pending.pending_txids(other));

        assert_eq!(states.settled_answer(other, &TXID), None);
        assert_eq!(states.settled_answer(principal(), &TXID), Some(Ok(())));
        assert_eq!(
            states.0.get(&(principal(), TXID)),
            Some(&BtcBroadcastState::Sent)
        );
    }
}
