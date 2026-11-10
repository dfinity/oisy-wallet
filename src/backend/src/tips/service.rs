//! Storage and orchestration for tips.
//!
//! The invariant this file exists to protect: **the canister never holds a
//! user's tokens.** Every payout is an `icrc2_transfer_from` drawing on an
//! allowance the sender granted under this tip's own spender subaccount, and
//! every failure path leaves the money where it already was — in the sender's
//! account.

use std::{cmp::Reverse, ops::Bound};

use candid::Principal;
use ic_cdk::api::{canister_self, msg_caller, time};
use shared::types::tip::{
    CreateTipRequest, MyTip, PublicTip, TipClaim, TipClaimFailureReason, TipClaimRequest,
    TipDetails, TipError, MAX_STORED_TIPS_PER_USER, MAX_TIPS_RETURNED,
    TIP_RETENTION_AFTER_TERMINAL_NS,
};

use super::{
    icrc2::{self, Account, AllowanceArgs, TransferFromArgs, TransferFromCallError},
    model::{
        claim_code_matches, new_tip_exceeds_cap, spender_subaccount, stored_block_index,
        validate_amount, validate_amount_width, validate_claim_code_hash, validate_expiry,
        validate_message, validate_tip_id, TipRecord, TipState,
    },
    secrets,
};
use crate::{
    state::{mutate_state, read_state, State},
    types::{
        maps::{TipMap, TipsBySenderMap},
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
/// A version of this function that never reached `main` stored `0` for a
/// terminal tip, so no stored index entry holds `0`. That freed the slot
/// correctly and silently broke retention: the test is
/// `now - value > retention`, and with `value = 0` that reads `now > 30 days`,
/// which is true by a factor of ~700 for every nanosecond timestamp there will
/// ever be. Every claimed and cancelled tip would have been collectable the
/// moment it became terminal, and would have vanished from History on the next
/// create or the next hourly sweep.
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

/// The finished tips one sender has to give up so that one more tip keeps them
/// within [`MAX_STORED_TIPS_PER_USER`].
///
/// Live tips are never chosen. Finished ones go in the order the retention
/// sweep would take them anyway, earliest `active_until` first, so this only
/// brings that sweep forward for a sender who creates tips faster than
/// retention lets them go.
///
/// A `Claiming` tip is never chosen either, even past its expiry: its payout
/// may still be outstanding, and a payout that lands writes `Claimed` to the
/// record it finds. The state decides this, not `has_claim_in_flight`, which
/// turns false at expiry. Retention still collects such a row like any other.
///
/// # Errors
/// [`TipError::TooManyTips`] when too few rows can be given up to make room.
fn finished_tips_over_storage_cap(
    tips: &TipMap,
    by_sender: &TipsBySenderMap,
    sender: Principal,
    now_ns: u64,
) -> Result<Vec<TipId>, TipError> {
    let prefix = StoredPrincipal(sender);
    let start = TipSenderKey(prefix, TipId(String::new()));
    let mut stored = 0usize;
    let mut finished = Vec::new();
    for entry in by_sender
        .range(start..)
        .take_while(|entry| entry.key().0 == prefix)
    {
        stored += 1;
        let active_until_ns = entry.value();
        if active_until_ns <= now_ns {
            finished.push((active_until_ns, entry.key().1.clone()));
        }
    }

    let excess = (stored + 1).saturating_sub(MAX_STORED_TIPS_PER_USER);
    finished.sort_unstable();
    // Lazy, so only as many records are decoded as it takes to find `excess`
    // rows, usually one.
    let given_up: Vec<TipId> = finished
        .into_iter()
        .map(|(_, tip_id)| tip_id)
        .filter(|tip_id| {
            !tips
                .get(tip_id)
                .is_some_and(|Candid(record)| matches!(record.state, TipState::Claiming { .. }))
        })
        .take(excess)
        .collect();
    if given_up.len() < excess {
        return Err(TipError::TooManyTips);
    }
    Ok(given_up)
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
        subaccount: Some(spender_subaccount(tip_id)),
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
    validate_amount_width(&request.amount)?;
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

    let mut removed = Vec::new();
    let created = mutate_state(|s| {
        // Re-read the clock. `now` above was taken before two awaited ledger
        // calls, and an expiry that was in the future when the request arrived
        // can be in the past by the time it is written — which would store a tip
        // that is already unclaimable and hand the sender a dead link. The same
        // stale reading also drove the retention sweep below.
        let now = time();
        validate_expiry(request.expires_at_ns, now)?;

        // Collect the caller's own past-retention rows first, so History
        // pruning is driven by the sender who is actually using the feature
        // rather than waiting on the hourly sweep. Scoped to one sender, so it
        // stays cheap.
        let (active_count, collectable) = partition_sender_tips(&s.tips_by_sender, sender, now);
        for stale in collectable {
            remove_tip(s, &stale, sender);
            removed.push(stale);
        }
        if s.tips.contains_key(&tip_id) {
            return Err(TipError::DuplicateTipId);
        }
        if new_tip_exceeds_cap(active_count) {
            return Err(TipError::TooManyTips);
        }

        // A tip that lapses frees its live slot at once but stays for retention,
        // so the live cap alone does not bound what a sender keeps stored.
        for finished in finished_tips_over_storage_cap(&s.tips, &s.tips_by_sender, sender, now)? {
            remove_tip(s, &finished, sender);
            removed.push(finished);
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
                payout_created_at_ns: None,
            },
        );
        Ok(())
    });

    // Outside the borrow above, as in `prune_expired_tips`: dropping a secret
    // goes through `mutate_state` itself.
    for tip_id in removed {
        let _ = secrets::remove_tip_secret_for(sender, tip_id.0);
    }

    created
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

/// Pays a tip out to the caller.
///
/// The record flips to `Claiming` **before** the ledger call, so a second caller
/// arriving mid-flight sees `ClaimInProgress` rather than starting a second
/// payout. A definite failure reverts it to `Reserved`; a deadline with no
/// answer leaves it `Claiming` until [`TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS`] has
/// passed. A retry is safe either way, even after a payout whose answer never
/// arrived: the payout carries the tip's own `created_at_time`, so a retry by
/// the same claimer is the *same* transaction and the ledger either executes it
/// once or names the block where it already did.
///
/// That is what an ambiguous answer is worth resolving into. Without the stamp a
/// payout that landed and whose reply was lost came back on the next attempt as
/// a spent allowance — the claimer told the tip was no longer available while
/// the money sat in their account, and the sender's History saying the
/// reservation had been revoked. Both wrong, in the one direction a payments
/// feature cannot afford.
///
/// **Once, but not by this state machine alone.** The `Claiming` guard lapses
/// after [`TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS`], because a claim whose reply never
/// comes back must not strand the tip forever. A first `transfer_from` that is
/// still genuinely in flight past that point — a congested subnet, not only the
/// upgrade case — can therefore overlap a second attempt. Deduplication covers
/// that overlap, but only while the ledger still recognises the stamp
/// ([`TIP_PAYOUT_DEDUP_WINDOW_NS`]); past that the tip starts a new transaction
/// identity and the question is open again. What stops both from paying either
/// way is the allowance covering exactly one payout, which the frontend sizes and
/// `create_tip` only checks a lower bound on. So "exactly once" remains a
/// property of the allowance, and this code's job is not to weaken it.
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
    let (record, payout_created_at_ns) = mutate_state(|s| {
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

        // Pinned here rather than at the call below, and committed with the
        // reservation: a stamp the retry cannot read back is no stamp at all.
        let (claiming, payout_created_at_ns) = record.start_claim(claimer, now);
        store_tip(s, &key, claiming.clone());
        Ok((claiming, payout_created_at_ns))
    })?;

    let transfer = icrc2::transfer_from(
        record.ledger_canister_id,
        TransferFromArgs {
            // The subaccount of *this canister* the allowance was granted to.
            // Omitting it would address the bare-principal allowance, which for
            // tips is always empty — every tip's allowance sits under its own
            // subaccount, and that is what keeps one tip's reservation unusable
            // for another.
            spender_subaccount: Some(spender_subaccount(&tip_id)),
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
            // The tip's own stamp, not this attempt's. Every other field here is
            // already fixed by the tip, so pinning this one makes a retry the
            // same transaction to the ledger — which is what turns "the answer
            // never came back" from a payout written off as a failure into a
            // payout the ledger can still account for.
            created_at_time: Some(payout_created_at_ns),
        },
    )
    .await;

    match transfer {
        Ok(block_index) => {
            let claimed_at_ns = time();
            mutate_state(|s| {
                // Only if this claim still owns the slot, the same test
                // `release_claim` applies to a failure. Without it a late success
                // wrote `Claimed` over whatever it found — including a
                // `Claimed{someone_else}` that had already paid out, which would
                // erase the record of who actually received the money.
                if let Some(Candid(current)) = s
                    .tips
                    .get(&key)
                    .filter(|Candid(current)| claim_is_ours(current, claimer, now))
                {
                    store_tip(
                        s,
                        &key,
                        TipRecord {
                            state: TipState::Claimed {
                                claimer,
                                block_index: stored_block_index(&block_index),
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
        // The deadline passing is not an answer, so the slot is left exactly as
        // it was. `cancel_tip` admits `Reserved` only, and releasing the claim
        // here would hand it a tip whose payout may still be running and may
        // still pay — the case the guard there exists to refuse. The tip is not
        // stranded either: `is_claimable` opens it to a fresh claim once
        // `TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS` has passed, as it does for a claim
        // whose reply never came back at all.
        Err(TransferFromCallError::Unresolved(msg)) => Err(TipError::TransferFailed { msg }),
        Err(err) => Err(refuse_claim(&key, claimer, now, err)),
    }
}

/// What a refused payout means for the tip: the reason History records,
/// whether the payout stamp is retired, and what the claimer is told.
///
/// One decision read three ways, so it is made in one place. History's reason
/// and the caller's error partition the ledger's refusals exactly the same way,
/// and letting them drift apart is how a claimer and a sender end up with
/// different accounts of the same attempt. Free of state, so the stamp rule has
/// a unit test: the ledger in the integration tests cannot be made to answer
/// `TooOld`.
struct Refusal {
    reason: TipClaimFailureReason,
    retire_payout_stamp: bool,
    error: TipError,
}

impl From<TransferFromCallError> for Refusal {
    fn from(err: TransferFromCallError) -> Self {
        match err {
            TransferFromCallError::InsufficientAllowance => Self {
                reason: TipClaimFailureReason::Uncovered,
                retire_payout_stamp: false,
                error: TipError::Uncovered,
            },
            TransferFromCallError::InsufficientFunds => Self {
                reason: TipClaimFailureReason::InsufficientFunds,
                retire_payout_stamp: false,
                error: TipError::InsufficientFunds,
            },
            // Nothing finer to say about a stale stamp in History: it is one more
            // attempt that did not pay out, and retrying is the advice. The stamp
            // itself goes, since the ledger refuses every retry that carries it.
            TransferFromCallError::TooOld => Self {
                reason: TipClaimFailureReason::TransferFailed,
                retire_payout_stamp: true,
                error: TipError::TransferFailed {
                    msg: "the payout's created_at_time fell outside the ledger's transaction \
                          window; the next attempt starts a new one"
                        .to_string(),
                },
            },
            TransferFromCallError::Unresolved(msg) | TransferFromCallError::Failed(msg) => Self {
                reason: TipClaimFailureReason::TransferFailed,
                retire_payout_stamp: false,
                error: TipError::TransferFailed { msg },
            },
        }
    }
}

/// The failure half of [`claim_tip`]: returns the tip to the pool as its
/// [`Refusal`] says, and hands back what the claimer is told.
///
/// `Unresolved` never reaches it: `claim_tip` answers that one without touching
/// the slot.
fn refuse_claim(
    key: &TipId,
    claimer: Principal,
    started_at_ns: u64,
    err: TransferFromCallError,
) -> TipError {
    let Refusal {
        reason,
        retire_payout_stamp,
        error,
    } = err.into();
    release_claim(key, claimer, started_at_ns, reason, retire_payout_stamp);
    error
}

/// Whether the record is still the `Claiming` slot this call created.
///
/// Both ends of a claim need this and for the same reason. A claim that timed
/// out and was taken over must not have its late answer — success or failure —
/// overwrite whoever holds the tip now. The claimer alone is not enough to
/// identify it: the same principal can retry after a timeout, so the start
/// instant is what distinguishes this attempt from that one.
fn claim_is_ours(record: &TipRecord, claimer: Principal, started_at_ns: u64) -> bool {
    matches!(
        record.state,
        TipState::Claiming {
            claimer: in_flight_claimer,
            started_at_ns: in_flight_started,
        } if in_flight_claimer == claimer && in_flight_started == started_at_ns
    )
}

/// Returns a failed claim's tip to `Reserved` and records why it failed, but
/// only if this claim still owns it. A claim that timed out and was taken over by
/// someone else must not have its late failure clobber the new claimer's state —
/// nor mark the tip failed when somebody else is mid-payout.
///
/// The record is what lets History separate "nobody has tried this yet" from
/// "somebody tried and it did not pay out", which is the only one of the two the
/// sender can act on.
///
/// `retire_payout_stamp` is passed through to
/// [`TipRecord::released_after_failure`], which says when it is right to set it.
fn release_claim(
    key: &TipId,
    claimer: Principal,
    started_at_ns: u64,
    reason: TipClaimFailureReason,
    retire_payout_stamp: bool,
) {
    mutate_state(|s| {
        let Some(Candid(current)) = s.tips.get(key) else {
            return;
        };
        if claim_is_ours(&current, claimer, started_at_ns) {
            let released = current.released_after_failure(reason, time(), retire_payout_stamp);
            store_tip(s, key, released);
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
        // `Reserved`, and not past its deadline — which is what the doc above
        // always said and the code did not do.
        //
        // A timed-out `Claiming` used to qualify. The timeout only means no
        // *reply* has come back; the ledger call may still be outstanding and
        // may still pay, and the success branch of `claim_tip` writes `Claimed`
        // over whatever it finds. So cancelling one returned Ok on a promise the
        // canister could not keep. The sender's allowance is theirs to revoke
        // either way, which is the lever that actually stops a payout.
        //
        // An expired tip is refused for a quieter reason: it lapsed, and
        // rewriting that history row as `Cancelled` claims the sender did
        // something they did not.
        if !matches!(record.state, TipState::Reserved) || record.is_expired(now) {
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

/// Removes tips whose retention window has passed, taking the by-sender index
/// entries that come after `after` one at a time, for as long as
/// `within_budget` holds, and always at least one, so that every call makes
/// progress. Intended for periodic housekeeping, in batches.
///
/// Returns the last entry taken while entries remain, or `None` once all of
/// them are done, together with the number of tips removed.
///
/// Note what this does **not** do: it never touches a live tip, and it does not
/// remove a tip the moment it expires. A lapsed tip is a History row the sender
/// is entitled to see; it goes once
/// [`TIP_RETENTION_AFTER_TERMINAL_NS`] has passed.
///
/// The index holds each tip's [`active_until`], so deciding decodes no record,
/// and `within_budget` is asked after each removal: one call costs its budget
/// plus one tip, however many tips are stored. Mirrors
/// `contacts::migration::migrate_batch`.
pub fn prune_expired_tips(
    mut after: Option<TipSenderKey>,
    now_ns: u64,
    mut within_budget: impl FnMut() -> bool,
) -> (Option<TipSenderKey>, u64) {
    let mut pruned = 0;

    loop {
        let Some((key, past_retention)) = mutate_state(|s| prune_next(s, after.as_ref(), now_ns))
        else {
            return (None, pruned);
        };

        // Outside the borrow above, deliberately: dropping a secret goes through
        // `mutate_state` itself, and calling it from inside that closure would
        // panic on the `RefCell` rather than fail politely. Without this the
        // store grew forever — a tip's record was swept after its retention
        // window while its ciphertext stayed behind with nothing left to point
        // at it.
        if past_retention {
            let TipSenderKey(StoredPrincipal(sender), tip_id) = &key;
            let _ = secrets::remove_tip_secret_for(*sender, tip_id.0.clone());
            pruned += 1;
        }
        after = Some(key);

        if !within_budget() {
            return (after, pruned);
        }
    }
}

/// Takes the by-sender index entry after `after` (the first one for `None`)
/// and removes its tip if the retention window has passed. Returns the entry's
/// key and whether its tip was removed, or `None` past the last entry.
fn prune_next(
    s: &mut State,
    after: Option<&TipSenderKey>,
    now_ns: u64,
) -> Option<(TipSenderKey, bool)> {
    let (key, active_until_ns) = match after {
        Some(after) => s
            .tips_by_sender
            .range((Bound::Excluded(after.clone()), Bound::Unbounded))
            .next(),
        None => s.tips_by_sender.iter().next(),
    }
    .map(|entry| (entry.key().clone(), entry.value()))?;

    let past_retention = active_until_ns <= now_ns
        && now_ns.saturating_sub(active_until_ns) > TIP_RETENTION_AFTER_TERMINAL_NS;
    if past_retention {
        let TipSenderKey(StoredPrincipal(sender), tip_id) = &key;
        remove_tip(s, tip_id, *sender);
    }

    Some((key, past_retention))
}

#[cfg(test)]
mod tests {
    use candid::Nat;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use pretty_assertions::assert_eq;
    use serde_bytes::ByteBuf;
    use shared::types::tip::MAX_TIPS_PER_USER;

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
            payout_created_at_ns: None,
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

    fn sender_key(sender: u8, tip_id: &str) -> TipSenderKey {
        TipSenderKey(
            StoredPrincipal(test_principal(sender)),
            TipId(tip_id.into()),
        )
    }

    /// Stores a reserved tip through [`store_tip`], so the record and the index
    /// agree as they do in the canister.
    fn store_reserved(sender: u8, tip_id: &str, expires_at_ns: u64) {
        mutate_state(|s| {
            store_tip(
                s,
                &TipId(tip_id.into()),
                TipRecord {
                    sender: test_principal(sender),
                    ..record_with(TipState::Reserved, expires_at_ns)
                },
            );
        });
    }

    fn stored_tip_ids() -> Vec<String> {
        read_state(|s| s.tips.keys().map(|tip_id| tip_id.0).collect())
    }

    fn indexed_tip_ids() -> Vec<String> {
        read_state(|s| s.tips_by_sender.keys().map(|key| key.1 .0).collect())
    }

    #[test]
    fn the_sweep_removes_only_tips_past_retention() {
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;
        store_reserved(1, "live", now + 1);
        store_reserved(1, "lapsed", now - 1);
        store_reserved(2, "edge", now - TIP_RETENTION_AFTER_TERMINAL_NS);
        store_reserved(2, "old", now - TIP_RETENTION_AFTER_TERMINAL_NS - 1);
        store_reserved(3, "oldest", 0);

        assert_eq!(prune_expired_tips(None, now, || true), (None, 2));
        assert_eq!(stored_tip_ids(), vec!["edge", "lapsed", "live"]);
        assert_eq!(
            indexed_tip_ids(),
            vec!["lapsed", "live", "edge"],
            "the index loses exactly the removed tips"
        );
    }

    #[test]
    fn a_sweep_batch_stops_at_its_budget_and_the_next_resumes_after_it() {
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;
        for sender in 1..=5 {
            store_reserved(sender, &format!("tip-{sender}"), 0);
        }
        let two_per_batch = || {
            let mut taken = 0;
            move || {
                taken += 1;
                taken < 2
            }
        };

        let first = prune_expired_tips(None, now, two_per_batch());
        assert_eq!(first, (Some(sender_key(2, "tip-2")), 2));
        assert_eq!(stored_tip_ids(), vec!["tip-3", "tip-4", "tip-5"]);

        // The batch resumes after an entry it removed itself.
        let second = prune_expired_tips(first.0, now, two_per_batch());
        assert_eq!(second, (Some(sender_key(4, "tip-4")), 2));

        let third = prune_expired_tips(second.0, now, two_per_batch());
        assert_eq!(third, (None, 1));
        assert_eq!(stored_tip_ids(), Vec::<String>::new());
    }

    #[test]
    fn a_sweep_batch_takes_one_entry_even_without_budget() {
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;
        store_reserved(1, "first", now + 1);
        store_reserved(1, "second", now + 1);

        assert_eq!(
            prune_expired_tips(None, now, || false),
            (Some(sender_key(1, "first")), 0),
            "every batch makes progress, so the sweep always ends"
        );
        assert_eq!(stored_tip_ids(), vec!["first", "second"]);
    }

    /// The link between the ledger refusing a stamp and the next attempt pinning
    /// a fresh one. `classify`, `released_after_failure` and `start_claim` each
    /// have tests of their own; this pins the flag that joins them, so a stamp the
    /// ledger refused never rides along on the retry.
    #[test]
    fn only_a_stale_stamp_is_retired_and_the_retry_pins_a_fresh_one() {
        let stale = Refusal::from(TransferFromCallError::TooOld);
        assert!(stale.retire_payout_stamp);
        assert_eq!(stale.reason, TipClaimFailureReason::TransferFailed);
        assert!(matches!(stale.error, TipError::TransferFailed { .. }));

        for err in [
            TransferFromCallError::InsufficientAllowance,
            TransferFromCallError::InsufficientFunds,
            TransferFromCallError::Unresolved("deadline".to_string()),
            TransferFromCallError::Failed("rejected".to_string()),
        ] {
            let label = format!("{err:?}");
            assert!(
                !Refusal::from(err).retire_payout_stamp,
                "{label} keeps the stamp, which a retry still needs"
            );
        }

        let claimer = test_principal(2);
        let first_attempt = 1_000;
        let (claiming, refused_stamp) =
            record_with(TipState::Reserved, u64::MAX).start_claim(claimer, first_attempt);
        let released = claiming.released_after_failure(
            stale.reason,
            first_attempt + 1,
            stale.retire_payout_stamp,
        );
        assert_eq!(released.payout_created_at_ns, None);

        let retry = first_attempt + 2;
        let (_, fresh) = released.start_claim(claimer, retry);
        assert_eq!(fresh, retry, "the retry pins a fresh stamp");
        assert_ne!(fresh, refused_stamp, "not the one the ledger refused");
    }

    fn insert_tips(map: &mut TipsBySenderMap, sender: Principal, rows: &[(&str, u64)]) {
        for (tip_id, active_until_ns) in rows {
            map.insert(
                TipSenderKey(StoredPrincipal(sender), TipId((*tip_id).to_string())),
                *active_until_ns,
            );
        }
    }

    fn ids(tip_ids: &[TipId]) -> Vec<String> {
        tip_ids.iter().map(|id| id.0.clone()).collect()
    }

    fn in_memory_tip_map() -> TipMap {
        let mm = MemoryManager::init(DefaultMemoryImpl::default());
        TipMap::init(mm.get(MemoryId::new(0)))
    }

    /// A claim that started before the tip's expiry and has no answer yet: the
    /// state a payout still outstanding past expiry leaves in both maps.
    fn insert_claiming_past_expiry(
        tips: &mut TipMap,
        by_sender: &mut TipsBySenderMap,
        tip_id: &str,
        expired_at_ns: u64,
    ) {
        let record = record_with(
            TipState::Claiming {
                claimer: test_principal(2),
                started_at_ns: expired_at_ns - 1,
            },
            expired_at_ns,
        );
        by_sender.insert(
            TipSenderKey(StoredPrincipal(record.sender), TipId(tip_id.to_string())),
            active_until(&record),
        );
        tips.insert(TipId(tip_id.to_string()), Candid(record));
    }

    #[test]
    fn the_live_cap_leaves_room_under_the_storage_cap() {
        const { assert!(shared::types::tip::MAX_TIPS_PER_USER < MAX_STORED_TIPS_PER_USER) };
    }

    #[test]
    fn a_sender_below_the_storage_cap_keeps_every_row() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        let names: Vec<String> = (0..MAX_STORED_TIPS_PER_USER - 1)
            .map(|i| format!("done-{i}"))
            .collect();
        let rows: Vec<(&str, u64)> = names.iter().map(|name| (name.as_str(), now - 1)).collect();
        insert_tips(&mut map, alice, &rows);

        assert_eq!(
            finished_tips_over_storage_cap(&in_memory_tip_map(), &map, alice, now),
            Ok(vec![]),
            "one more tip still fits, so nothing is given up"
        );
    }

    #[test]
    fn the_storage_cap_gives_up_the_earliest_finished_rows_and_never_a_live_one() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let bob = test_principal(2);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        // A full store: one live tip, the rest finished at different instants.
        let names: Vec<String> = (0..MAX_STORED_TIPS_PER_USER - 1)
            .map(|i| format!("done-{i:03}"))
            .collect();
        let mut rows: Vec<(&str, u64)> = names
            .iter()
            .zip(1u64..)
            .map(|(name, age)| (name.as_str(), now - age))
            .collect();
        rows.push(("live", now + 1));
        insert_tips(&mut map, alice, &rows);
        // Another sender's rows never count towards alice's store.
        insert_tips(&mut map, bob, &[("b-done", now - 1), ("b-live", now + 1)]);

        let tips = in_memory_tip_map();
        let last = format!("done-{:03}", MAX_STORED_TIPS_PER_USER - 2);
        assert_eq!(
            finished_tips_over_storage_cap(&tips, &map, alice, now).map(|given_up| ids(&given_up)),
            Ok(vec![last]),
            "one more tip takes the row that finished first, the one retention would take next"
        );
        assert_eq!(
            finished_tips_over_storage_cap(&tips, &map, bob, now),
            Ok(vec![]),
            "and alice's rows never count towards bob's"
        );
    }

    #[test]
    fn a_store_far_over_the_cap_is_brought_back_under_it_in_one_create() {
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        let names: Vec<String> = (0..MAX_STORED_TIPS_PER_USER + 10)
            .map(|i| format!("done-{i:03}"))
            .collect();
        let rows: Vec<(&str, u64)> = names
            .iter()
            .zip(1u64..)
            .map(|(name, age)| (name.as_str(), now - age))
            .collect();
        insert_tips(&mut map, alice, &rows);

        let given_up = ids(
            &finished_tips_over_storage_cap(&in_memory_tip_map(), &map, alice, now)
                .expect("finished rows can make room"),
        );
        assert_eq!(given_up.len(), 11);
        assert_eq!(
            given_up[0],
            format!("done-{:03}", MAX_STORED_TIPS_PER_USER + 9),
            "earliest-finished first"
        );
    }

    #[test]
    fn the_storage_cap_never_gives_up_a_claiming_row_past_its_expiry() {
        let mut tips = in_memory_tip_map();
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        // A full store whose oldest finished row is a claim still awaiting its
        // payout.
        let names: Vec<String> = (0..MAX_STORED_TIPS_PER_USER - 1)
            .map(|i| format!("done-{i:03}"))
            .collect();
        let rows: Vec<(&str, u64)> = names
            .iter()
            .zip(1u64..)
            .map(|(name, age)| (name.as_str(), now - age))
            .collect();
        insert_tips(&mut map, alice, &rows);
        insert_claiming_past_expiry(&mut tips, &mut map, "paying", now - 1_000);

        let next = format!("done-{:03}", MAX_STORED_TIPS_PER_USER - 2);
        assert_eq!(
            finished_tips_over_storage_cap(&tips, &map, alice, now).map(|given_up| ids(&given_up)),
            Ok(vec![next]),
            "the claim keeps its record, so a payout that lands can still write `Claimed`"
        );
    }

    #[test]
    fn a_full_store_whose_finished_rows_are_all_claiming_takes_no_new_tip() {
        let mut tips = in_memory_tip_map();
        let mut map = in_memory_by_sender_map();
        let alice = test_principal(1);
        let now = 10 * TIP_RETENTION_AFTER_TERMINAL_NS;

        let live: Vec<String> = (0..MAX_TIPS_PER_USER)
            .map(|i| format!("live-{i:03}"))
            .collect();
        let rows: Vec<(&str, u64)> = live.iter().map(|name| (name.as_str(), now + 1)).collect();
        insert_tips(&mut map, alice, &rows);
        for i in MAX_TIPS_PER_USER..MAX_STORED_TIPS_PER_USER {
            insert_claiming_past_expiry(&mut tips, &mut map, &format!("paying-{i:03}"), now - 1);
        }

        assert_eq!(
            finished_tips_over_storage_cap(&tips, &map, alice, now),
            Err(TipError::TooManyTips),
            "no row can make room, so the store stays at the cap"
        );
    }
}
