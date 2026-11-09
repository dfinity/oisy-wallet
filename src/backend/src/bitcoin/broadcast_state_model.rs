//! What `btc_broadcast_transaction` knows about each transaction it reserved, so that a request
//! with the same txid neither pays for a broadcast that already went out nor races one still in
//! flight.
//!
//! States are kept per principal, network and txid: a txid names the same transaction on every
//! network, but a broadcast on one says nothing about another.
//!
//! The states live in heap memory, not stable memory, so an upgrade clears them. That allows at
//! most `MAX_BROADCAST_ATTEMPTS` more paid broadcasts of a transaction whose inputs are still in
//! the UTXO view, and releases nothing: a resend after the upgrade finds its reservation, reuses
//! it, and so keeps it whatever the answer. A state is dropped with its reservation, so there are
//! never more states than reservations.
//!
//! A txid is reserved at most once per principal, on any address: both `begin_broadcast` and
//! `reserve_without_broadcast` refuse a txid that is already reserved unless they reuse exactly
//! that reservation. So releasing a txid's reservation frees only the inputs it reserved, and a
//! state can follow its reservation by txid alone.

use std::{
    cell::RefCell,
    collections::{HashMap, HashSet},
};

use candid::Principal;
use ic_cdk_bitcoin_canister::{Network as BitcoinNetwork, Utxo};
use shared::types::bitcoin::{
    BtcAddPendingTransactionError, BtcBroadcastTransactionError, StoredPendingTransaction,
};

use super::pending_tx_model::BtcUserPendingTransactionsModel;

/// The paid broadcasts of one transaction after which an unclear outcome is final until the usual
/// prune releases the reservation.
pub const MAX_BROADCAST_ATTEMPTS: u8 = 3;

/// `attempts` counts the paid broadcasts so far.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BtcBroadcastState {
    /// `attempt_id` tells this attempt's completion apart from that of an older one, whose
    /// reservation was pruned while it was in flight.
    InFlight {
        attempts: u8,
        attempt_id: u64,
    },
    Sent,
    Unknown {
        attempts: u8,
    },
}

/// Indexed by principal first, so a prune only visits the caller's own states.
#[derive(Debug, Default)]
pub struct BtcBroadcastStates {
    by_principal: HashMap<Principal, HashMap<(BitcoinNetwork, [u8; 32]), BtcBroadcastState>>,
    next_attempt_id: u64,
}

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
        network: BitcoinNetwork,
        txid: &[u8; 32],
    ) -> Option<Result<(), BtcBroadcastTransactionError>> {
        match self.get(principal, network, txid)? {
            BtcBroadcastState::Sent => Some(Ok(())),
            BtcBroadcastState::InFlight { .. } => {
                Some(Err(BtcBroadcastTransactionError::BroadcastInProgress))
            }
            BtcBroadcastState::Unknown { .. } => None,
        }
    }

    pub fn retain_reserved(&mut self, principal: Principal, reserved_txids: &HashSet<Vec<u8>>) {
        let Some(states) = self.by_principal.get_mut(&principal) else {
            return;
        };
        states.retain(|(_, txid), _| reserved_txids.contains(txid.as_slice()));
        if states.is_empty() {
            self.by_principal.remove(&principal);
        }
    }

    fn get(
        &self,
        principal: Principal,
        network: BitcoinNetwork,
        txid: &[u8; 32],
    ) -> Option<BtcBroadcastState> {
        self.by_principal
            .get(&principal)?
            .get(&(network, *txid))
            .copied()
    }

    fn set(
        &mut self,
        principal: Principal,
        network: BitcoinNetwork,
        txid: [u8; 32],
        state: BtcBroadcastState,
    ) {
        self.by_principal
            .entry(principal)
            .or_default()
            .insert((network, txid), state);
    }

    fn remove(&mut self, principal: Principal, network: BitcoinNetwork, txid: &[u8; 32]) {
        let Some(states) = self.by_principal.get_mut(&principal) else {
            return;
        };
        states.remove(&(network, *txid));
        if states.is_empty() {
            self.by_principal.remove(&principal);
        }
    }

    fn is_current(
        &self,
        principal: Principal,
        network: BitcoinNetwork,
        txid: &[u8; 32],
        attempt: &BroadcastAttempt,
    ) -> bool {
        matches!(
            self.get(principal, network, txid),
            Some(BtcBroadcastState::InFlight { attempt_id, .. }) if attempt_id == attempt.id
        )
    }
}

/// The transaction a broadcast is for: the caller's, on `network`, reserved at `address`.
#[derive(Clone, Copy, Debug)]
pub struct BroadcastTarget<'a> {
    pub principal: Principal,
    pub network: BitcoinNetwork,
    pub address: &'a str,
    pub txid: [u8; 32],
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
    pub id: u64,
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
    target: &BroadcastTarget<'_>,
    utxos: Vec<Utxo>,
    reserved_at_ns: u64,
) -> Result<Option<BroadcastAttempt>, BtcBroadcastTransactionError> {
    let BroadcastTarget {
        principal,
        network,
        address,
        txid,
    } = *target;
    let reserved_txids = pending.pending_txids(principal);
    states.retain_reserved(principal, &reserved_txids);

    let attempts = match states.get(principal, network, &txid) {
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

    let reservation = if pending.has_same_txid_reservation(principal, address, &txid, &utxos) {
        Reservation::Reused
    } else if reserved_txids.contains(txid.as_slice())
        || pending.has_intersecting_pending_utxos(principal, &utxos)
    {
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

    let id = states.next_attempt_id;
    states.next_attempt_id += 1;
    states.set(
        principal,
        network,
        txid,
        BtcBroadcastState::InFlight {
            attempts,
            attempt_id: id,
        },
    );
    Ok(Some(BroadcastAttempt {
        reservation,
        attempts,
        id,
    }))
}

/// Reserves a transaction OISY signed but does not broadcast itself
/// (`btc_add_pending_transaction`), with the same rules as `begin_broadcast`: a retry over exactly
/// the same UTXOs at the same address succeeds without a second insert, and any other reservation
/// of the txid or of an input is refused.
///
/// It is refused while a broadcast of the same transaction is in flight. That broadcast may still
/// be refused and release the reservation it inserted, which would free inputs this call had just
/// reported as reserved.
///
/// # Errors
/// `UtxosAlreadyReserved`, or `InternalError` when the reservation cannot be stored.
pub fn reserve_without_broadcast(
    pending: &mut BtcUserPendingTransactionsModel<'_>,
    states: &mut BtcBroadcastStates,
    principal: Principal,
    network: BitcoinNetwork,
    address: &str,
    transaction: StoredPendingTransaction,
) -> Result<(), BtcAddPendingTransactionError> {
    let reserved_txids = pending.pending_txids(principal);
    states.retain_reserved(principal, &reserved_txids);

    let is_in_flight = <[u8; 32]>::try_from(transaction.txid.as_slice()).is_ok_and(|txid| {
        matches!(
            states.get(principal, network, &txid),
            Some(BtcBroadcastState::InFlight { .. })
        )
    });
    if is_in_flight {
        return Err(BtcAddPendingTransactionError::UtxosAlreadyReserved);
    }
    if pending.has_same_txid_reservation(principal, address, &transaction.txid, &transaction.utxos)
    {
        return Ok(());
    }
    if reserved_txids.contains(&transaction.txid)
        || pending.has_intersecting_pending_utxos(principal, &transaction.utxos)
    {
        return Err(BtcAddPendingTransactionError::UtxosAlreadyReserved);
    }
    pending
        .add_pending_transaction(principal, address.to_string(), transaction)
        .map_err(|msg| BtcAddPendingTransactionError::InternalError { msg })
}

/// Records the outcome of the attempt `begin_broadcast` cleared.
///
/// A refusal releases the reservation only if this attempt inserted it. A reused reservation is
/// older than this attempt, and something under it may have gone out: an earlier attempt, one
/// from before an upgrade cleared the states, or a transaction handed to a third party after
/// `btc_add_pending_transaction`. So `BroadcastRejected` means nothing for this txid can have gone
/// out while it was reserved.
///
/// If the attempt is no longer the current one, its reservation was pruned while it was in
/// flight, and the reservation and state now belong to a newer attempt or to nobody. Nothing is
/// changed then.
///
/// # Errors
/// `BroadcastRejected` or `BroadcastOutcomeUnknown`.
pub fn finish_broadcast(
    pending: &mut BtcUserPendingTransactionsModel<'_>,
    states: &mut BtcBroadcastStates,
    target: &BroadcastTarget<'_>,
    attempt: BroadcastAttempt,
    outcome: BroadcastOutcome,
) -> Result<(), BtcBroadcastTransactionError> {
    let BroadcastTarget {
        principal,
        network,
        address,
        txid,
    } = *target;
    if !states.is_current(principal, network, &txid, &attempt) {
        return match outcome {
            BroadcastOutcome::Sent => Ok(()),
            BroadcastOutcome::Refused { msg } | BroadcastOutcome::Unknown { msg } => {
                Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown { msg })
            }
        };
    }

    match (outcome, attempt.reservation) {
        (BroadcastOutcome::Sent, _) => {
            states.set(principal, network, txid, BtcBroadcastState::Sent);
            Ok(())
        }
        (BroadcastOutcome::Refused { msg }, Reservation::Inserted) => {
            pending.remove_pending_transaction(principal, address, &txid);
            states.remove(principal, network, &txid);
            Err(BtcBroadcastTransactionError::BroadcastRejected { msg })
        }
        (BroadcastOutcome::Refused { msg } | BroadcastOutcome::Unknown { msg }, _) => {
            states.set(
                principal,
                network,
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
    use ic_cdk_bitcoin_canister::{Network as BitcoinNetwork, OutPoint, Txid, Utxo};
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use shared::types::bitcoin::{
        BtcAddPendingTransactionError, BtcBroadcastTransactionError, StoredPendingTransaction,
    };

    use super::{
        begin_broadcast, finish_broadcast, reserve_without_broadcast, BroadcastAttempt,
        BroadcastOutcome, BroadcastTarget, BtcBroadcastState, BtcBroadcastStates, Reservation,
        MAX_BROADCAST_ATTEMPTS,
    };
    use crate::{
        bitcoin::pending_tx_model::BtcUserPendingTransactionsModel,
        types::BtcUserPendingTransactionsMap,
    };

    const ADDRESS: &str = "bc1q-caller";
    const TXID: [u8; 32] = [0x77; 32];
    const OTHER_TXID: [u8; 32] = [0x88; 32];
    const RESERVED_AT_NS: u64 = 1_000;
    const NETWORK: BitcoinNetwork = BitcoinNetwork::Mainnet;

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

    fn target(txid: [u8; 32]) -> BroadcastTarget<'static> {
        BroadcastTarget {
            principal: principal(),
            network: NETWORK,
            address: ADDRESS,
            txid,
        }
    }

    fn begin(
        pending: &mut BtcUserPendingTransactionsModel<'_>,
        states: &mut BtcBroadcastStates,
        txid: [u8; 32],
    ) -> Result<Option<BroadcastAttempt>, BtcBroadcastTransactionError> {
        begin_broadcast(pending, states, &target(txid), utxos(), RESERVED_AT_NS)
    }

    fn finish(
        pending: &mut BtcUserPendingTransactionsModel<'_>,
        states: &mut BtcBroadcastStates,
        attempt: BroadcastAttempt,
        outcome: BroadcastOutcome,
    ) -> Result<(), BtcBroadcastTransactionError> {
        finish_broadcast(pending, states, &target(TXID), attempt, outcome)
    }

    /// The reservation and attempt count, without the attempt's id.
    fn shape(attempt: Option<BroadcastAttempt>) -> Option<(Reservation, u8)> {
        attempt.map(|attempt| (attempt.reservation, attempt.attempts))
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
        assert_eq!(shape(Some(attempt)), Some((Reservation::Inserted, 1)));
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
    fn a_retry_after_sent_pays_nothing_while_its_reservation_lasts() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent).unwrap();

        // Answered before the UTXO fetch, so the inputs' absence from this call's view never
        // matters.
        assert_eq!(
            states.settled_answer(principal(), NETWORK, &TXID),
            Some(Ok(()))
        );
        assert_eq!(begin(&mut pending, &mut states, TXID), Ok(None));

        // Once the transaction confirms, its inputs leave the view, and the next prune drops the
        // reservation and the state with it. A retry is then a new request.
        let unrelated = Utxo {
            outpoint: OutPoint {
                txid: Txid::from([0x22; 32]),
                vout: 0,
            },
            value: 10_000,
            height: 101,
        };
        pending.prune_pending_transactions(
            principal(),
            ADDRESS,
            &[unrelated],
            RESERVED_AT_NS + 1,
            RESERVED_AT_NS + 2,
        );
        states.retain_reserved(principal(), &pending.pending_txids(principal()));
        assert_eq!(reserved_txids(&pending), Vec::<Vec<u8>>::new());
        assert_eq!(states.settled_answer(principal(), NETWORK, &TXID), None);
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
            states.settled_answer(principal(), NETWORK, &TXID),
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
        assert_eq!(states.settled_answer(principal(), NETWORK, &TXID), None);

        assert_eq!(
            shape(begin(&mut pending, &mut states, TXID).unwrap()),
            Some((Reservation::Inserted, 1))
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
        assert_eq!(shape(Some(retry)), Some((Reservation::Reused, 2)));
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
        assert_eq!(shape(Some(resend)), Some((Reservation::Reused, 1)));
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
            states.settled_answer(principal(), NETWORK, &TXID),
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
        assert_eq!(
            states.settled_answer(principal(), NETWORK, &OTHER_TXID),
            None
        );
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

        assert_eq!(states.settled_answer(principal(), NETWORK, &TXID), None);
        assert_eq!(
            shape(begin(&mut pending, &mut states, TXID).unwrap()),
            Some((Reservation::Inserted, 1))
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

        assert_eq!(states.settled_answer(other, NETWORK, &TXID), None);
        assert_eq!(
            states.settled_answer(principal(), NETWORK, &TXID),
            Some(Ok(()))
        );
        assert_eq!(
            states.get(principal(), NETWORK, &TXID),
            Some(BtcBroadcastState::Sent)
        );
    }

    #[test]
    fn a_late_completion_leaves_a_newer_attempt_alone() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let old = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        // As the prune does once the reservation expired while `old` was still in flight.
        pending.remove_pending_transaction(principal(), ADDRESS, &TXID);
        states.retain_reserved(principal(), &pending.pending_txids(principal()));
        let newer = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        assert_eq!(shape(Some(newer)), Some((Reservation::Inserted, 1)));

        assert_eq!(
            finish(&mut pending, &mut states, old, refused()),
            Err(BtcBroadcastTransactionError::BroadcastOutcomeUnknown {
                msg: "refused".to_string()
            }),
            "a stale refusal cannot vouch for the newer attempt"
        );
        assert_eq!(reserved_txids(&pending), vec![TXID.to_vec()]);
        assert_eq!(
            states.settled_answer(principal(), NETWORK, &TXID),
            Some(Err(BtcBroadcastTransactionError::BroadcastInProgress))
        );

        assert_eq!(
            finish(&mut pending, &mut states, newer, refused()),
            Err(BtcBroadcastTransactionError::BroadcastRejected {
                msg: "refused".to_string()
            })
        );
        assert_eq!(reserved_txids(&pending), Vec::<Vec<u8>>::new());
    }

    #[test]
    fn a_late_completion_does_not_recreate_a_pruned_state() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let old = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        pending.remove_pending_transaction(principal(), ADDRESS, &TXID);
        states.retain_reserved(principal(), &pending.pending_txids(principal()));

        assert_eq!(
            finish(&mut pending, &mut states, old, BroadcastOutcome::Sent),
            Ok(())
        );
        assert_eq!(states.get(principal(), NETWORK, &TXID), None);
    }

    #[test]
    fn states_are_kept_per_network() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();

        assert_eq!(
            states.settled_answer(principal(), BitcoinNetwork::Testnet, &TXID),
            None,
            "an attempt in flight on mainnet does not block testnet"
        );

        finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent).unwrap();
        assert_eq!(
            states.settled_answer(principal(), NETWORK, &TXID),
            Some(Ok(()))
        );
        assert_eq!(
            states.settled_answer(principal(), BitcoinNetwork::Testnet, &TXID),
            None,
            "a mainnet success does not answer a testnet request"
        );
    }

    fn add(
        pending: &mut BtcUserPendingTransactionsModel<'_>,
        states: &mut BtcBroadcastStates,
        txid: [u8; 32],
    ) -> Result<(), BtcAddPendingTransactionError> {
        reserve_without_broadcast(
            pending,
            states,
            principal(),
            NETWORK,
            ADDRESS,
            StoredPendingTransaction {
                txid: txid.to_vec(),
                utxos: utxos(),
                created_at_timestamp_ns: RESERVED_AT_NS,
            },
        )
    }

    fn reservation_count(pending: &BtcUserPendingTransactionsModel<'_>) -> usize {
        pending
            .get_pending_transactions(&principal(), ADDRESS)
            .len()
    }

    #[test]
    fn adding_the_same_transaction_while_its_broadcast_is_in_flight_is_refused() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();

        // Acknowledging it would let the broadcast's refusal free inputs reported as reserved.
        assert_eq!(
            add(&mut pending, &mut states, TXID),
            Err(BtcAddPendingTransactionError::UtxosAlreadyReserved)
        );

        assert_eq!(
            finish(&mut pending, &mut states, attempt, refused()),
            Err(BtcBroadcastTransactionError::BroadcastRejected {
                msg: "refused".to_string()
            })
        );
        assert_eq!(reservation_count(&pending), 0);
    }

    #[test]
    fn adding_the_same_transaction_after_its_broadcast_reuses_the_reservation() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        let attempt = begin(&mut pending, &mut states, TXID).unwrap().unwrap();
        finish(&mut pending, &mut states, attempt, BroadcastOutcome::Sent).unwrap();

        assert_eq!(add(&mut pending, &mut states, TXID), Ok(()));
        assert_eq!(reservation_count(&pending), 1);
    }

    #[test]
    fn a_retry_of_an_added_transaction_is_not_blocked_by_its_own_reservation() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();

        assert_eq!(add(&mut pending, &mut states, TXID), Ok(()));
        assert_eq!(add(&mut pending, &mut states, TXID), Ok(()));
        assert_eq!(reservation_count(&pending), 1);
        assert_eq!(
            add(&mut pending, &mut states, OTHER_TXID),
            Err(BtcAddPendingTransactionError::UtxosAlreadyReserved)
        );
    }

    #[test]
    fn a_reservation_at_another_networks_address_is_not_reused() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        add(&mut pending, &mut states, TXID).unwrap();

        let testnet = BroadcastTarget {
            principal: principal(),
            network: BitcoinNetwork::Testnet,
            address: "tb1q-caller",
            txid: TXID,
        };
        assert_eq!(
            begin_broadcast(&mut pending, &mut states, &testnet, utxos(), RESERVED_AT_NS),
            Err(BtcBroadcastTransactionError::UtxosAlreadyReserved)
        );
        assert_eq!(
            pending.get_pending_transactions(&principal(), "tb1q-caller"),
            vec![]
        );
    }

    fn other_utxos() -> Vec<Utxo> {
        vec![Utxo {
            outpoint: OutPoint {
                txid: Txid::from([0x22; 32]),
                vout: 0,
            },
            value: 5_000,
            height: 100,
        }]
    }

    fn add_at(
        pending: &mut BtcUserPendingTransactionsModel<'_>,
        states: &mut BtcBroadcastStates,
        network: BitcoinNetwork,
        address: &str,
        utxos: Vec<Utxo>,
    ) -> Result<(), BtcAddPendingTransactionError> {
        reserve_without_broadcast(
            pending,
            states,
            principal(),
            network,
            address,
            StoredPendingTransaction {
                txid: TXID.to_vec(),
                utxos,
                created_at_timestamp_ns: 1,
            },
        )
    }

    #[test]
    fn a_txid_reserved_over_other_inputs_is_not_reserved_twice() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        add_at(&mut pending, &mut states, NETWORK, ADDRESS, other_utxos()).unwrap();

        assert_eq!(
            begin(&mut pending, &mut states, TXID),
            Err(BtcBroadcastTransactionError::UtxosAlreadyReserved)
        );
        assert_eq!(
            add_at(&mut pending, &mut states, NETWORK, ADDRESS, utxos()),
            Err(BtcAddPendingTransactionError::UtxosAlreadyReserved)
        );
        assert_eq!(
            pending.get_pending_transactions(&principal(), ADDRESS),
            vec![StoredPendingTransaction {
                txid: TXID.to_vec(),
                utxos: other_utxos(),
                created_at_timestamp_ns: 1,
            }],
            "the older reservation is the only one, and intact"
        );
    }

    #[test]
    fn a_txid_reserved_at_another_address_is_not_reserved_again() {
        let (mut map, _mm) = setup();
        let mut pending = BtcUserPendingTransactionsModel::new(&mut map, None, None);
        let mut states = BtcBroadcastStates::default();
        add_at(
            &mut pending,
            &mut states,
            BitcoinNetwork::Testnet,
            "tb1q-caller",
            other_utxos(),
        )
        .unwrap();

        // Otherwise the testnet reservation would keep a mainnet state alive after the mainnet
        // reservation is pruned, since states follow reservations by txid.
        assert_eq!(
            begin(&mut pending, &mut states, TXID),
            Err(BtcBroadcastTransactionError::UtxosAlreadyReserved)
        );
        assert_eq!(
            pending.get_pending_transactions(&principal(), ADDRESS),
            vec![]
        );
    }
}
