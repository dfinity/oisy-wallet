//! Storage and orchestration for tips.
//!
//! The invariant this file exists to protect: **the canister never holds a
//! user's tokens.** Every payout is an `icrc2_transfer_from` drawing on an
//! allowance the sender granted under this tip's own spender subaccount, and
//! every failure path leaves the money where it already was — in the sender's
//! account.

use std::cmp::Reverse;

use candid::Principal;
use ic_cdk::api::{canister_self, msg_caller, time};
use serde_bytes::ByteBuf;
use shared::types::tip::{
    CreateTipRequest, MyTip, PublicTip, TipClaim, TipClaimFailure, TipClaimFailureReason,
    TipClaimRequest, TipDetails, TipError, MAX_TIPS_RETURNED, TIP_RETENTION_AFTER_TERMINAL_NS,
};

use super::{
    icrc2::{self, Account, AllowanceArgs, TransferFromArgs, TransferFromCallError},
    model::{
        claim_code_matches, new_tip_exceeds_cap, spender_subaccount, validate_amount,
        validate_claim_code_hash, validate_expiry, validate_message, validate_tip_id, TipRecord,
        TipState,
    },
    secrets,
};
use crate::{
    state::{mutate_state, read_state, State},
    types::{
        maps::TipsBySenderMap,
        storable::{Candid, StoredPrincipal, TipId, TipSenderKey},
    },
};

/// The value stored in the by-sender index: the instant a tip stopped, or will
/// stop, occupying a cap slot.
///
/// For a live tip that is its expiry. For a terminal one it is **the instant it
/// became terminal**, which is already in the past — so the slot is freed
/// immediately (`value > now` is false) while the row stays in the index for
/// History, and the retention arithmetic below gets a real age to measure.
/// One `u64` answers both questions, which is what keeps the cap check a single
/// range scan.
///
/// This used to store `0` for a terminal tip. That freed the slot correctly and
/// silently broke retention: the test is `now - value > retention`, and with
/// `value = 0` that reads `now > 30 days`, which is true by a factor of ~700
/// for every nanosecond timestamp there will ever be. Every claimed and
/// cancelled tip was therefore collectable the moment it became terminal, and
/// vanished from History on the next create or the next hourly sweep.
fn active_until(record: &TipRecord) -> u64 {
    match record.state {
        TipState::Reserved | TipState::Claiming { .. } => record.expires_at_ns,
        TipState::Claimed { claimed_at_ns, .. } => claimed_at_ns,
        // `created_at_ns` only for a cancellation written before
        // `terminal_at_ns` existed: it starts the window early rather than
        // never, and a tip lives at most 7 days, so such a row loses at most a
        // week of its 30.
        TipState::Cancelled => record.terminal_at_ns.unwrap_or(record.created_at_ns),
    }
}

/// Range-scans one sender's slice of the by-sender index in a single pass,
/// returning their active-tip count and the ids of entries that are past
/// retention.
///
/// Scanning the index rather than the primary map keeps this cheap, and taking
/// the map directly (rather than re-entering `read_state` / `mutate_state`) lets
/// it run inside an existing state borrow without a `RefCell` double-borrow
/// panic. Mirrors `personal_notes::share::service::partition_creator_shares`.
fn partition_sender_tips(
    by_sender: &TipsBySenderMap,
    sender: Principal,
    now_ns: u64,
) -> (usize, Vec<TipId>) {
    let prefix = StoredPrincipal(sender);
    let start = TipSenderKey(prefix, TipId(String::new()));
    let mut active = 0usize;
    let mut collectable = Vec::new();
    for entry in by_sender
        .range(start..)
        .take_while(|entry| entry.key().0 == prefix)
    {
        let active_until_ns = entry.value();
        if active_until_ns > now_ns {
            active += 1;
        } else if now_ns.saturating_sub(active_until_ns) > TIP_RETENTION_AFTER_TERMINAL_NS {
            collectable.push(entry.key().1.clone());
        }
    }
    (active, collectable)
}

fn remove_tip(state: &mut State, tip_id: &TipId, sender: Principal) {
    state.tips.remove(tip_id);
    state
        .tips_by_sender
        .remove(&TipSenderKey(StoredPrincipal(sender), tip_id.clone()));
}

/// Writes a record back to the primary map and keeps the by-sender index's
/// `active_until` in step with it. Every state transition goes through here, so
/// the index can never disagree with the record about whether a tip is live.
fn store_tip(state: &mut State, tip_id: &TipId, record: TipRecord) {
    state.tips_by_sender.insert(
        TipSenderKey(StoredPrincipal(record.sender), tip_id.clone()),
        active_until(&record),
    );
    state.tips.insert(tip_id.clone(), Candid(record));
}

fn read_tip(tip_id: &TipId) -> Option<TipRecord> {
    read_state(|s| s.tips.get(tip_id).map(|Candid(record)| record))
}

/// The account this canister spends from on a given tip's behalf: itself, at
/// the tip's own subaccount.
fn tip_spender(tip_id: &str) -> Account {
    Account {
        owner: canister_self(),
        subaccount: Some(ByteBuf::from(spender_subaccount(tip_id).to_vec())),
    }
}

/// Creates a tip against an allowance the sender has already granted.
///
/// Verifies the reservation really covers the payout **and** its fee before
/// recording anything, so a tip that exists is a tip that was claimable at
/// creation. It cannot promise it stays that way — the sender can spend or
/// revoke afterwards, which is what `Uncovered` is for.
///
/// # Errors
/// Errors are enumerated by [`TipError`].
pub async fn create_tip(request: CreateTipRequest) -> Result<(), TipError> {
    validate_tip_id(&request.tip_id)?;
    validate_claim_code_hash(&request.claim_code_hash)?;
    validate_message(request.message.as_deref())?;
    let now = time();
    validate_expiry(request.expires_at_ns, now)?;

    let sender = msg_caller();
    let tip_id = TipId(request.tip_id.clone());

    // Fail fast before spending cycles on the ledger. Re-checked authoritatively
    // in the write below, which is what actually makes it safe.
    if read_state(|s| s.tips.contains_key(&tip_id)) {
        return Err(TipError::DuplicateTipId);
    }

    let ledger = request.ledger_canister_id;
    let fee = icrc2::fee(ledger)
        .await
        .map_err(|msg| TipError::TransferFailed { msg })?;
    validate_amount(&request.amount, &fee)?;

    let allowance = icrc2::allowance(
        ledger,
        AllowanceArgs {
            account: Account {
                owner: sender,
                subaccount: None,
            },
            spender: tip_spender(&request.tip_id),
        },
    )
    .await
    .map_err(|msg| TipError::TransferFailed { msg })?;

    // The ledger draws its fee from the allowance rather than from the amount,
    // so the claimer receives `amount` in full and the reservation has to cover
    // both. Proven against a real ledger in the spec's PR-0 spike.
    if allowance.allowance < request.amount.clone() + fee {
        return Err(TipError::Uncovered);
    }

    // A reservation that lapses before the tip does would leave a tip that
    // *looks* live and cannot pay out. Reject it rather than shipping a
    // deadline we cannot honour.
    if allowance
        .expires_at
        .is_some_and(|expires_at| expires_at < request.expires_at_ns)
    {
        return Err(TipError::InvalidExpiry);
    }

    mutate_state(|s| {
        // Collect the caller's own past-retention rows first, so History
        // pruning is driven by the sender who is actually using the feature
        // rather than waiting on the hourly sweep. Scoped to one sender, so it
        // stays cheap.
        let (active_count, collectable) = partition_sender_tips(&s.tips_by_sender, sender, now);
        for stale in collectable {
            remove_tip(s, &stale, sender);
        }
        if s.tips.contains_key(&tip_id) {
            return Err(TipError::DuplicateTipId);
        }
        if new_tip_exceeds_cap(active_count) {
            return Err(TipError::TooManyTips);
        }

        store_tip(
            s,
            &tip_id,
            TipRecord {
                sender,
                ledger_canister_id: ledger,
                amount: request.amount,
                expires_at_ns: request.expires_at_ns,
                created_at_ns: now,
                message: request.message,
                claim_code_hash: request.claim_code_hash,
                state: TipState::Reserved,
                terminal_at_ns: None,
                last_claim_failure: None,
            },
        );
        Ok(())
    })
}

/// What an anonymous reader of a tip link sees: amount, token, deadline.
///
/// Unknown, expired, claimed and cancelled all return `NotFound`, so a prober
/// with a random id learns nothing. Deliberately callable without an identity —
/// the whole point is that the recipient has no OISY account yet. Mirrors
/// `get_personal_note_share`.
///
/// # Errors
/// [`TipError::NotFound`] for anything not currently claimable.
pub fn get_tip(tip_id: String) -> Result<PublicTip, TipError> {
    validate_tip_id(&tip_id)?;
    let now = time();
    read_tip(&TipId(tip_id))
        .filter(|record| record.is_claimable(now) || record.has_claim_in_flight(now))
        .map(|record| record.to_public())
        .ok_or(TipError::NotFound)
}

/// The claim review: the public preview plus the sender's message. Requires the
/// claim code, so only someone holding the full link sees the message — the
/// anonymous preview never carries it.
///
/// # Errors
/// [`TipError::NotFound`] for an unclaimable tip or a wrong claim code.
pub fn get_tip_details(request: TipClaimRequest) -> Result<TipDetails, TipError> {
    validate_tip_id(&request.tip_id)?;
    let now = time();
    let record = read_tip(&TipId(request.tip_id)).ok_or(TipError::NotFound)?;
    if !claim_code_matches(&record.claim_code_hash, request.claim_code) {
        return Err(TipError::NotFound);
    }
    if !record.is_claimable(now) && !record.has_claim_in_flight(now) {
        return Err(TipError::NotFound);
    }
    Ok(record.to_details())
}

/// Pays a tip out to the caller, exactly once.
///
/// The record flips to `Claiming` **before** the ledger call, which is what
/// makes a double claim impossible: a second caller arriving mid-flight sees
/// `ClaimInProgress`, not a second payout. Every failure reverts to `Reserved`
/// — safe even for an ambiguous transport error, because the allowance itself
/// is the source of truth: if the transfer did happen, the next claim finds the
/// allowance consumed and fails `Uncovered` rather than paying twice.
///
/// # Errors
/// Errors are enumerated by [`TipError`].
pub async fn claim_tip(request: TipClaimRequest) -> Result<TipClaim, TipError> {
    let TipClaimRequest { tip_id, claim_code } = request;
    validate_tip_id(&tip_id)?;
    let claimer = msg_caller();
    let now = time();
    let key = TipId(tip_id.clone());

    // Reserve the claim, then release the state borrow before awaiting.
    let record = mutate_state(|s| {
        let Some(Candid(record)) = s.tips.get(&key) else {
            return Err(TipError::NotFound);
        };
        if record.has_claim_in_flight(now) {
            return Err(TipError::ClaimInProgress);
        }
        // Checked before the code so a wrong code and an unclaimable tip are
        // indistinguishable to a prober — both are `NotFound`.
        if !record.is_claimable(now) {
            return Err(TipError::NotFound);
        }
        if !claim_code_matches(&record.claim_code_hash, claim_code) {
            return Err(TipError::NotFound);
        }

        let claiming = TipRecord {
            state: TipState::Claiming {
                claimer,
                started_at_ns: now,
            },
            ..record
        };
        store_tip(s, &key, claiming.clone());
        Ok(claiming)
    })?;

    let transfer = icrc2::transfer_from(
        record.ledger_canister_id,
        TransferFromArgs {
            spender_subaccount: Some(ByteBuf::from(spender_subaccount(&tip_id).to_vec())),
            from: Account {
                owner: record.sender,
                subaccount: None,
            },
            to: Account {
                owner: claimer,
                subaccount: None,
            },
            amount: record.amount.clone(),
            fee: None,
            memo: None,
            created_at_time: None,
        },
    )
    .await;

    match transfer {
        Ok(block_index) => {
            let claimed_at_ns = time();
            mutate_state(|s| {
                if let Some(Candid(current)) = s.tips.get(&key) {
                    store_tip(
                        s,
                        &key,
                        TipRecord {
                            state: TipState::Claimed {
                                claimer,
                                block_index: block_index.clone(),
                                claimed_at_ns,
                            },
                            ..current
                        },
                    );
                }
            });
            // The payout landed, so the link is spent and the sender's
            // recoverable copy of the claim code has nothing left to recover.
            // Dropped here rather than left to the retention sweep because it is
            // dead the instant the transfer succeeds. Best-effort: a tip created
            // before this store existed has no secret, which is not an error, and
            // failing to drop opaque bytes must never fail a claim that already
            // moved money.
            let _ = secrets::remove_tip_secret_for(record.sender, key.0);

            Ok(TipClaim {
                ledger_canister_id: record.ledger_canister_id,
                amount: record.amount,
                block_index,
            })
        }
        Err(err) => {
            let reason = match &err {
                TransferFromCallError::InsufficientAllowance => TipClaimFailureReason::Uncovered,
                TransferFromCallError::InsufficientFunds => {
                    TipClaimFailureReason::InsufficientFunds
                }
                TransferFromCallError::Failed(_) => TipClaimFailureReason::TransferFailed,
            };
            release_claim(&key, claimer, now, reason);
            match err {
                TransferFromCallError::InsufficientAllowance => Err(TipError::Uncovered),
                TransferFromCallError::InsufficientFunds => Err(TipError::InsufficientFunds),
                TransferFromCallError::Failed(msg) => Err(TipError::TransferFailed { msg }),
            }
        }
    }
}

/// Returns a failed claim's tip to `Reserved` and records why it failed, but
/// only if this claim still owns it. A claim that timed out and was taken over by
/// someone else must not have its late failure clobber the new claimer's state —
/// nor mark the tip failed when somebody else is mid-payout.
///
/// The record is what lets History separate "nobody has tried this yet" from
/// "somebody tried and it did not pay out", which is the only one of the two the
/// sender can act on.
fn release_claim(
    key: &TipId,
    claimer: Principal,
    started_at_ns: u64,
    reason: TipClaimFailureReason,
) {
    mutate_state(|s| {
        let Some(Candid(current)) = s.tips.get(key) else {
            return;
        };
        let is_ours = matches!(
            current.state,
            TipState::Claiming {
                claimer: in_flight_claimer,
                started_at_ns: in_flight_started,
            } if in_flight_claimer == claimer && in_flight_started == started_at_ns
        );
        if is_ours {
            store_tip(
                s,
                key,
                TipRecord {
                    state: TipState::Reserved,
                    last_claim_failure: Some(TipClaimFailure {
                        at_ns: time(),
                        reason,
                    }),
                    ..current
                },
            );
        }
    });
}

/// Cancels an unclaimed tip. The allowance is the sender's to revoke — this
/// only stops the tip being claimable; the client pairs it with an
/// `icrc2_approve` of zero.
///
/// # Errors
/// [`TipError::NotFound`] if no such tip, [`TipError::NotYourTip`] if it belongs
/// to someone else, [`TipError::NotCancellable`] if it is not `Reserved`.
pub fn cancel_tip(tip_id: String) -> Result<(), TipError> {
    validate_tip_id(&tip_id)?;
    let caller = msg_caller();
    let now = time();
    let key = TipId(tip_id);

    mutate_state(|s| {
        let Some(Candid(record)) = s.tips.get(&key) else {
            return Err(TipError::NotFound);
        };
        if record.sender != caller {
            return Err(TipError::NotYourTip);
        }
        if record.has_claim_in_flight(now) {
            return Err(TipError::ClaimInProgress);
        }
        if !matches!(record.state, TipState::Reserved | TipState::Claiming { .. }) {
            return Err(TipError::NotCancellable);
        }

        store_tip(
            s,
            &key,
            TipRecord {
                state: TipState::Cancelled,
                terminal_at_ns: Some(now),
                ..record
            },
        );
        Ok(())
    })?;

    // The link is worthless once cancelled, so the recoverable copy of its claim
    // code goes with it. Best-effort: a tip with no stored secret (created before
    // the store existed) is not an error, and failing to drop opaque bytes the
    // canister cannot read must not fail a cancellation that already succeeded.
    let _ = secrets::remove_tip_secret_for(caller, key.0);

    Ok(())
}

/// The caller's own tips, newest first, capped at [`MAX_TIPS_RETURNED`].
///
/// # Errors
/// Errors are enumerated by [`TipError`].
pub fn get_my_tips() -> Result<Vec<MyTip>, TipError> {
    let caller = msg_caller();
    let now = time();
    let prefix = StoredPrincipal(caller);

    read_state(|s| {
        let mut tips: Vec<MyTip> = s
            .tips_by_sender
            .range(TipSenderKey(prefix, TipId(String::new()))..)
            .take_while(|entry| entry.key().0 == prefix)
            .filter_map(|entry| {
                let tip_id = entry.key().1.clone();
                s.tips
                    .get(&tip_id)
                    .map(|Candid(record)| record.to_my_tip(tip_id.0, now))
            })
            .collect();
        tips.sort_by_key(|tip| Reverse(tip.created_at_ns));
        tips.truncate(MAX_TIPS_RETURNED);
        Ok(tips)
    })
}

/// Removes tips whose retention window has passed and returns the number
/// removed. Intended for periodic housekeeping.
///
/// Note what this does **not** do: it never touches a live tip, and it does not
/// remove a tip the moment it expires. A lapsed tip is a History row the sender
/// is entitled to see; it goes once
/// [`TIP_RETENTION_AFTER_TERMINAL_NS`] has passed. A full scan is fine for an
/// hourly sweep. Mirrors `personal_notes::share::service::prune_expired_shares`.
pub fn prune_expired_tips() -> u64 {
    let now = time();

    let collected: Vec<(TipId, Principal)> = mutate_state(|s| {
        let collectable: Vec<(TipId, Principal)> = s
            .tips
            .iter()
            .filter(|entry| {
                let active_until_ns = active_until(&entry.value().0);
                active_until_ns <= now
                    && now.saturating_sub(active_until_ns) > TIP_RETENTION_AFTER_TERMINAL_NS
            })
            .map(|entry| (entry.key().clone(), entry.value().0.sender))
            .collect();

        for (tip_id, sender) in &collectable {
            remove_tip(s, tip_id, *sender);
        }
        collectable
    });

    // Outside the borrow above, deliberately: dropping a secret goes through
    // `mutate_state` itself, and calling it from inside this closure would panic
    // on the `RefCell` rather than fail politely. Without this the store grew
    // forever — a tip's record was swept after its retention window while its
    // ciphertext stayed behind with nothing left to point at it.
    for (tip_id, sender) in &collected {
        let _ = secrets::remove_tip_secret_for(*sender, tip_id.0.clone());
    }

    collected.len() as u64
}

#[cfg(test)]
mod tests {
    use candid::Nat;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;

    use super::*;

    fn test_principal(id: u8) -> Principal {
        Principal::from_slice(&[id])
    }

    fn in_memory_by_sender_map() -> TipsBySenderMap {
        let mm = MemoryManager::init(DefaultMemoryImpl::default());
        TipsBySenderMap::init(mm.get(MemoryId::new(0)))
    }

    fn record_with(state: TipState, expires_at_ns: u64) -> TipRecord {
        TipRecord {
            sender: test_principal(1),
            ledger_canister_id: test_principal(9),
            amount: Nat::from(1_000u64),
            expires_at_ns,
            created_at_ns: 0,
            message: None,
            claim_code_hash: ByteBuf::from(vec![0u8; 32]),
            state,
            terminal_at_ns: None,
            last_claim_failure: None,
        }
    }

    fn claimed_at(claimed_at_ns: u64) -> TipState {
        TipState::Claimed {
            claimer: test_principal(2),
            block_index: Nat::from(1u64),
            claimed_at_ns,
        }
    }

    #[test]
    fn active_until_is_the_expiry_while_live_and_the_terminal_instant_after() {
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;
        let expiry = now + 1;

        assert_eq!(
            active_until(&record_with(TipState::Reserved, expiry)),
            expiry
        );
        assert_eq!(
            active_until(&record_with(
                TipState::Claiming {
                    claimer: test_principal(2),
                    started_at_ns: 1,
                },
                expiry
            )),
            expiry
        );

        let claimed = record_with(claimed_at(now), expiry);
        assert_eq!(
            active_until(&claimed),
            now,
            "a claimed tip reports when it was claimed, not a sentinel"
        );
        assert!(
            active_until(&claimed) <= now,
            "and that is already in the past, so the cap slot is free"
        );

        let cancelled = TipRecord {
            terminal_at_ns: Some(now),
            ..record_with(TipState::Cancelled, expiry)
        };
        assert_eq!(active_until(&cancelled), now);
    }

    #[test]
    fn a_cancellation_written_before_terminal_at_ns_falls_back_to_creation() {
        let created_at_ns = 7_000u64;
        let legacy = TipRecord {
            created_at_ns,
            terminal_at_ns: None,
            ..record_with(TipState::Cancelled, 9_000)
        };

        assert_eq!(
            active_until(&legacy),
            created_at_ns,
            "an early retention start, not an immediate one"
        );
    }

    /// The regression. The old code stored `0` for a terminal tip, and `0` is
    /// what [`partition_sender_tips`] measures retention against — so
    /// `now - 0 > retention` held for every claimed tip and History lost it on
    /// the next create or the next hourly sweep.
    ///
    /// This test feeds a terminal record's `active_until` *through* the
    /// partition, which is precisely what the two original tests did not do:
    /// one asserted the sentinel, the other fed the partition only realistic
    /// timestamps, and the bug lived in the seam between them.
    #[test]
    fn a_freshly_claimed_tip_survives_pruning() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        let just_claimed = record_with(claimed_at(now), now + 1_000);
        map.insert(
            TipSenderKey(StoredPrincipal(alice), TipId("claimed-now".into())),
            active_until(&just_claimed),
        );

        let (active, collectable) = partition_sender_tips(&map, alice, now);

        assert_eq!(active, 0, "a claimed tip must not hold a cap slot");
        assert!(
            collectable.is_empty(),
            "but it must stay in History: it was claimed this instant, not 30 days ago"
        );
    }

    #[test]
    fn a_claimed_tip_is_collected_once_past_retention() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        let long_claimed = record_with(
            claimed_at(now - TIP_RETENTION_AFTER_TERMINAL_NS - 1),
            now - 1_000,
        );
        map.insert(
            TipSenderKey(StoredPrincipal(alice), TipId("claimed-long-ago".into())),
            active_until(&long_claimed),
        );

        let (_, collectable) = partition_sender_tips(&map, alice, now);

        assert_eq!(
            collectable
                .iter()
                .map(|id| id.0.clone())
                .collect::<Vec<_>>(),
            vec!["claimed-long-ago".to_string()],
            "retention still expires — the fix keeps rows, it does not keep them forever"
        );
    }

    #[test]
    fn partition_counts_only_this_senders_live_tips() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let bob = test_principal(2);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        map.insert(
            TipSenderKey(StoredPrincipal(alice), TipId("a-live".into())),
            now + 1,
        );
        map.insert(
            TipSenderKey(StoredPrincipal(alice), TipId("a-just-lapsed".into())),
            now - 1,
        );
        map.insert(
            TipSenderKey(StoredPrincipal(bob), TipId("b-live".into())),
            now + 1,
        );

        let (active, collectable) = partition_sender_tips(&map, alice, now);
        assert_eq!(active, 1);
        assert!(
            collectable.is_empty(),
            "a tip that lapsed a moment ago is still within retention"
        );
        assert_eq!(partition_sender_tips(&map, bob, now).0, 1);
        assert_eq!(partition_sender_tips(&map, test_principal(3), now).0, 0);
    }

    #[test]
    fn partition_collects_only_past_retention_and_only_for_this_sender() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let bob = test_principal(2);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        map.insert(
            TipSenderKey(StoredPrincipal(alice), TipId("a-old".into())),
            now - TIP_RETENTION_AFTER_TERMINAL_NS - 1,
        );
        map.insert(
            TipSenderKey(StoredPrincipal(alice), TipId("a-edge".into())),
            now - TIP_RETENTION_AFTER_TERMINAL_NS,
        );
        map.insert(
            TipSenderKey(StoredPrincipal(bob), TipId("b-old".into())),
            now - TIP_RETENTION_AFTER_TERMINAL_NS - 1,
        );

        let (active, collectable) = partition_sender_tips(&map, alice, now);
        assert_eq!(active, 0);
        assert_eq!(
            collectable
                .iter()
                .map(|id| id.0.clone())
                .collect::<Vec<_>>(),
            vec!["a-old".to_string()],
            "retention boundary is exclusive, and another sender's rows never leak in"
        );
    }
}
