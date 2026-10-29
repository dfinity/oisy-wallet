//! Pure domain type and invariant checks for tips. No IC calls or state access
//! here — see `service.rs` for orchestration.

use candid::{CandidType, Deserialize, Nat, Principal};
use serde_bytes::ByteBuf;
use sha2::{Digest, Sha256};
use shared::types::tip::{
    MyTip, PublicTip, TipClaimFailure, TipDetails, TipError, TipStatus, MAX_TIPS_PER_USER,
    MAX_TIP_EXPIRY_NS, MAX_TIP_ID_BYTES, MAX_TIP_MESSAGE_CHARS, TIP_CLAIM_CODE_HASH_BYTES,
    TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS, TIP_PAYOUT_DEDUP_WINDOW_NS,
};

/// Where a tip is in its lifecycle, as stored.
///
/// `Claiming` exists so a claim can reserve the tip *before* awaiting the
/// ledger: two concurrent claims cannot both reach the transfer, and a claim
/// that dies mid-flight (canister upgrade) is recoverable by timeout rather
/// than stranding the tip forever.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TipState {
    Reserved,
    Claiming {
        claimer: Principal,
        started_at_ns: u64,
    },
    Claimed {
        claimer: Principal,
        block_index: Nat,
        claimed_at_ns: u64,
    },
    Cancelled,
}

/// The stored record for one tip.
///
/// `claim_code_hash` is the SHA-256 of the code that lives only in the link
/// fragment: the code itself never reaches the canister, and no endpoint
/// returns the hash. `sender` is returned only to the sender's own
/// `get_my_tips` — never to a claimer or an anonymous reader.
#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TipRecord {
    pub sender: Principal,
    pub ledger_canister_id: Principal,
    pub amount: Nat,
    pub expires_at_ns: u64,
    pub created_at_ns: u64,
    pub message: Option<String>,
    pub claim_code_hash: ByteBuf,
    pub state: TipState,
    /// When the tip reached a terminal state, which is where its retention
    /// window starts counting from.
    ///
    /// Only `Cancelled` needs it — `Claimed` already carries `claimed_at_ns`,
    /// and a live tip has no terminal instant. An `Option` rather than a field
    /// on the variant so records already in stable memory keep decoding:
    /// candid reads a missing `opt` as `None`, whereas turning the unit
    /// `Cancelled` into a record would make every stored cancellation
    /// undecodable.
    pub terminal_at_ns: Option<u64>,
    /// The most recent claim attempt that did not pay out.
    ///
    /// Set on every failed payout and never cleared: a tip that failed once and
    /// then succeeded is worth being able to see. `status` decides what that
    /// means for the reader, and only reports `Failed` while the tip is still
    /// live. `Option` so records already in stable memory keep decoding.
    pub last_claim_failure: Option<TipClaimFailure>,
    /// The `created_at_time` this tip's payout is sent with, pinned by the first
    /// claim attempt and reused by later ones.
    ///
    /// This is what makes a retry the *same* transaction to the ledger, so an
    /// attempt whose answer never arrived is deduplicated rather than executed
    /// twice. `TipState::Claiming`'s `started_at_ns` cannot serve: it is taken
    /// fresh on every takeover, which is precisely what would defeat
    /// deduplication.
    ///
    /// One stamp per tip rather than per claimer, because two claimers differ in
    /// the `to` account and their payouts are distinct transactions regardless.
    /// `Option` so records already in stable memory keep decoding, and so a
    /// stamp the ledger has stopped recognising can be retired — see
    /// [`TIP_PAYOUT_DEDUP_WINDOW_NS`].
    pub payout_created_at_ns: Option<u64>,
}

impl TipRecord {
    pub fn is_expired(&self, now_ns: u64) -> bool {
        self.expires_at_ns <= now_ns
    }

    /// Whether a claim may proceed: the tip is unexpired and either untouched
    /// or left in flight by a claim that never came back (see
    /// [`TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS`]).
    pub fn is_claimable(&self, now_ns: u64) -> bool {
        if self.is_expired(now_ns) {
            return false;
        }
        match &self.state {
            TipState::Reserved => true,
            TipState::Claiming { started_at_ns, .. } => {
                now_ns.saturating_sub(*started_at_ns) >= TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS
            }
            TipState::Claimed { .. } | TipState::Cancelled => false,
        }
    }

    /// Whether a claim is in flight and still within its window — the one case
    /// that earns [`TipError::ClaimInProgress`] rather than `NotFound`, since it
    /// resolves on its own and the caller should simply retry.
    pub fn has_claim_in_flight(&self, now_ns: u64) -> bool {
        matches!(&self.state, TipState::Claiming { started_at_ns, .. }
            if now_ns.saturating_sub(*started_at_ns) < TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS)
            && !self.is_expired(now_ns)
    }

    /// The lifecycle as the sender sees it in History. A claim in flight still
    /// reads as `Reserved` — an attempt is not a payout.
    pub fn status(&self, now_ns: u64) -> TipStatus {
        match &self.state {
            TipState::Claimed { .. } => TipStatus::Claimed,
            TipState::Cancelled => TipStatus::Cancelled,
            TipState::Reserved | TipState::Claiming { .. } => {
                if self.is_expired(now_ns) {
                    // Expired outranks Failed: once the deadline has passed there
                    // is nothing left for the sender to do about the failure.
                    TipStatus::Expired
                } else if self.last_claim_failure.is_some() {
                    TipStatus::Failed
                } else {
                    TipStatus::Reserved
                }
            }
        }
    }

    /// Reserves the tip for a claim attempt: flips it to `Claiming` and settles
    /// the `created_at_time` the payout will carry.
    ///
    /// The stamp the first attempt pinned is reused while the ledger can still
    /// deduplicate against it, and renewed once it has aged past
    /// [`TIP_PAYOUT_DEDUP_WINDOW_NS`] — a stamp the ledger would answer `TooOld`
    /// for is worse than no stamp, since it refuses the retry instead of
    /// resolving it. Renewing is the point at which the earlier attempt's
    /// outcome stops being knowable: nothing below the ledger can tell whether
    /// it landed, and the allowance covering exactly one payout is what still
    /// keeps a tip from paying twice.
    ///
    /// Returns the stamp alongside the record so the caller never has to unwrap
    /// the `Option` it has just filled in.
    pub fn start_claim(self, claimer: Principal, now_ns: u64) -> (Self, u64) {
        let payout_created_at_ns = self
            .payout_created_at_ns
            .filter(|pinned| now_ns.saturating_sub(*pinned) < TIP_PAYOUT_DEDUP_WINDOW_NS)
            .unwrap_or(now_ns);

        (
            Self {
                state: TipState::Claiming {
                    claimer,
                    started_at_ns: now_ns,
                },
                payout_created_at_ns: Some(payout_created_at_ns),
                ..self
            },
            payout_created_at_ns,
        )
    }

    pub fn claimed_by(&self) -> Option<Principal> {
        match &self.state {
            TipState::Claimed { claimer, .. } => Some(*claimer),
            _ => None,
        }
    }

    /// What an anonymous reader of the link may see: amount, token, deadline.
    /// Never the message, the sender, or the claimer.
    pub fn to_public(&self) -> PublicTip {
        PublicTip {
            ledger_canister_id: self.ledger_canister_id,
            amount: self.amount.clone(),
            expires_at_ns: self.expires_at_ns,
        }
    }

    /// What an authenticated claimer sees before committing: the preview plus
    /// the sender's message.
    pub fn to_details(&self) -> TipDetails {
        TipDetails {
            ledger_canister_id: self.ledger_canister_id,
            amount: self.amount.clone(),
            expires_at_ns: self.expires_at_ns,
            message: self.message.clone(),
        }
    }

    pub fn to_my_tip(&self, tip_id: String, now_ns: u64) -> MyTip {
        MyTip {
            tip_id,
            ledger_canister_id: self.ledger_canister_id,
            amount: self.amount.clone(),
            expires_at_ns: self.expires_at_ns,
            created_at_ns: self.created_at_ns,
            status: self.status(now_ns),
            message: self.message.clone(),
            claimed_by: self.claimed_by(),
            last_claim_failure: self.last_claim_failure.clone(),
        }
    }
}

/// SHA-256 of a claim code. Used to check a submitted code against the stored
/// hash, and — over the tip id — to derive the tip's spender subaccount.
pub fn sha256(bytes: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    hasher.finalize().into()
}

/// The per-tip spender subaccount: `SHA-256(tip_id)`, 32 bytes, exactly the
/// width an ICRC-1 subaccount takes.
///
/// This is the load-bearing part of the no-custody model. The sender approves
/// this canister *at this subaccount only*, so the resulting allowance can pay
/// out this tip and nothing else — a second tip from the same sender to the
/// same canister sits at a different subaccount and cannot be drawn on.
pub fn spender_subaccount(tip_id: &str) -> [u8; 32] {
    sha256(tip_id.as_bytes())
}

/// Constant-time comparison of a submitted claim code against the stored hash.
///
/// Guessing a 128-bit code is the real barrier here, not comparison timing, but
/// a byte-by-byte early return leaks a prefix oracle for free and there is no
/// reason to hand it over.
///
/// Takes the code **by value**: a claim code is checked once and has no further
/// use, so consuming it keeps the plaintext from lingering in a caller's scope.
pub fn claim_code_matches(stored_hash: &[u8], submitted_code: String) -> bool {
    let submitted = sha256(&submitted_code.into_bytes());
    if stored_hash.len() != submitted.len() {
        return false;
    }
    stored_hash
        .iter()
        .zip(submitted.iter())
        .fold(0u8, |acc, (a, b)| acc | (a ^ b))
        == 0
}

pub fn validate_tip_id(tip_id: &str) -> Result<(), TipError> {
    if tip_id.is_empty() || tip_id.len() > MAX_TIP_ID_BYTES as usize {
        return Err(TipError::InvalidTipId);
    }
    Ok(())
}

pub fn validate_claim_code_hash(hash: &[u8]) -> Result<(), TipError> {
    if hash.len() != TIP_CLAIM_CODE_HASH_BYTES {
        return Err(TipError::InvalidClaimCodeHash);
    }
    Ok(())
}

pub fn validate_message(message: Option<&str>) -> Result<(), TipError> {
    if let Some(message) = message {
        if message.chars().count() > MAX_TIP_MESSAGE_CHARS {
            return Err(TipError::MessageTooLong);
        }
    }
    Ok(())
}

/// Validates the requested expiry is strictly in the future and no further out
/// than [`MAX_TIP_EXPIRY_NS`] — defense-in-depth against a client bypassing the
/// UI's expiry options to encumber a balance indefinitely.
pub fn validate_expiry(expires_at_ns: u64, now_ns: u64) -> Result<(), TipError> {
    if expires_at_ns <= now_ns || expires_at_ns - now_ns > MAX_TIP_EXPIRY_NS {
        return Err(TipError::InvalidExpiry);
    }
    Ok(())
}

/// The minimum tip is one ledger fee.
///
/// This is the answer to "minimum amount per token" without a per-token table
/// to maintain: below the cost of moving it, a tip is spam by construction, and
/// the ledger already tells us that number.
pub fn validate_amount(amount: &Nat, ledger_fee: &Nat) -> Result<(), TipError> {
    if amount == &Nat::from(0u8) || amount < ledger_fee {
        return Err(TipError::AmountTooSmall);
    }
    Ok(())
}

/// Whether creating another tip would exceed the per-sender active-tip cap.
pub fn new_tip_exceeds_cap(active_count: usize) -> bool {
    active_count >= MAX_TIPS_PER_USER
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;
    use shared::types::tip::TipClaimFailureReason;

    use super::*;

    const ONE_SEC: u64 = 1_000_000_000;

    fn principal(id: u8) -> Principal {
        Principal::from_slice(&[id])
    }

    fn record(state: TipState, expires_at_ns: u64) -> TipRecord {
        TipRecord {
            sender: principal(1),
            ledger_canister_id: principal(9),
            amount: Nat::from(1_000u64),
            expires_at_ns,
            created_at_ns: 0,
            message: Some("thanks!".to_string()),
            claim_code_hash: ByteBuf::from(sha256(b"code").to_vec()),
            state,
            terminal_at_ns: None,
            last_claim_failure: None,
            payout_created_at_ns: None,
        }
    }

    #[test]
    fn tip_id_bounds() {
        assert_eq!(validate_tip_id(""), Err(TipError::InvalidTipId));
        assert!(validate_tip_id("a").is_ok());
        assert!(validate_tip_id(&"a".repeat(MAX_TIP_ID_BYTES as usize)).is_ok());
        assert_eq!(
            validate_tip_id(&"a".repeat(MAX_TIP_ID_BYTES as usize + 1)),
            Err(TipError::InvalidTipId)
        );
    }

    #[test]
    fn claim_code_hash_must_be_exactly_sha256_wide() {
        assert!(validate_claim_code_hash(&[0u8; TIP_CLAIM_CODE_HASH_BYTES]).is_ok());
        assert_eq!(
            validate_claim_code_hash(&[0u8; TIP_CLAIM_CODE_HASH_BYTES - 1]),
            Err(TipError::InvalidClaimCodeHash)
        );
        assert_eq!(
            validate_claim_code_hash(&[0u8; TIP_CLAIM_CODE_HASH_BYTES + 1]),
            Err(TipError::InvalidClaimCodeHash)
        );
        assert_eq!(
            validate_claim_code_hash(&[]),
            Err(TipError::InvalidClaimCodeHash)
        );
    }

    #[test]
    fn message_limit_counts_characters_not_bytes() {
        assert!(validate_message(None).is_ok());
        assert!(validate_message(Some("")).is_ok());
        assert!(validate_message(Some(&"a".repeat(MAX_TIP_MESSAGE_CHARS))).is_ok());
        assert_eq!(
            validate_message(Some(&"a".repeat(MAX_TIP_MESSAGE_CHARS + 1))),
            Err(TipError::MessageTooLong)
        );
        // A 4-byte emoji is one character: 250 of them fit, 251 do not. Counting
        // bytes here would reject a message the UI presents as well within limit.
        assert!(validate_message(Some(&"🎉".repeat(MAX_TIP_MESSAGE_CHARS))).is_ok());
        assert_eq!(
            validate_message(Some(&"🎉".repeat(MAX_TIP_MESSAGE_CHARS + 1))),
            Err(TipError::MessageTooLong)
        );
    }

    #[test]
    fn expiry_must_be_in_the_future_and_bounded() {
        let now = 1_000 * ONE_SEC;
        assert_eq!(validate_expiry(now, now), Err(TipError::InvalidExpiry));
        assert_eq!(validate_expiry(now - 1, now), Err(TipError::InvalidExpiry));
        assert!(validate_expiry(now + ONE_SEC, now).is_ok());
        assert!(validate_expiry(now + MAX_TIP_EXPIRY_NS, now).is_ok());
        assert_eq!(
            validate_expiry(now + MAX_TIP_EXPIRY_NS + 1, now),
            Err(TipError::InvalidExpiry)
        );
    }

    #[test]
    fn minimum_tip_is_one_ledger_fee() {
        let fee = Nat::from(10_000u64);
        assert_eq!(
            validate_amount(&Nat::from(0u8), &fee),
            Err(TipError::AmountTooSmall)
        );
        assert_eq!(
            validate_amount(&Nat::from(9_999u64), &fee),
            Err(TipError::AmountTooSmall)
        );
        assert!(validate_amount(&fee, &fee).is_ok());
        assert!(validate_amount(&Nat::from(10_001u64), &fee).is_ok());
    }

    #[test]
    fn cap_boundary() {
        assert!(!new_tip_exceeds_cap(MAX_TIPS_PER_USER - 1));
        assert!(new_tip_exceeds_cap(MAX_TIPS_PER_USER));
    }

    #[test]
    fn claim_code_matches_only_the_right_code() {
        let stored = sha256(b"the-real-code");
        assert!(claim_code_matches(&stored, "the-real-code".to_string()));
        assert!(!claim_code_matches(&stored, "the-real-cod".to_string()));
        assert!(!claim_code_matches(&stored, String::new()));
        // A stored hash of the wrong width can never match, and must not panic.
        assert!(!claim_code_matches(
            &stored[..31],
            "the-real-code".to_string()
        ));
    }

    #[test]
    fn spender_subaccount_is_per_tip_and_deterministic() {
        let a = spender_subaccount("tip-a");
        assert_eq!(a, spender_subaccount("tip-a"));
        assert_ne!(
            a,
            spender_subaccount("tip-b"),
            "two tips must never share a spender subaccount — that isolation is what \
             keeps one tip's allowance unusable for another"
        );
        assert_eq!(a.len(), 32, "an ICRC-1 subaccount is 32 bytes wide");
    }

    #[test]
    fn reserved_tip_is_claimable_until_it_expires() {
        let tip = record(TipState::Reserved, 100);
        assert!(tip.is_claimable(99));
        assert!(!tip.is_claimable(100), "expiry is inclusive");
        assert!(!tip.is_claimable(101));
        assert_eq!(tip.status(99), TipStatus::Reserved);
        assert_eq!(tip.status(100), TipStatus::Expired);
    }

    #[test]
    fn a_failed_claim_shows_as_failed_only_while_the_tip_is_still_live() {
        let now = 10 * ONE_SEC;
        let failure = Some(TipClaimFailure {
            at_ns: now - ONE_SEC,
            reason: TipClaimFailureReason::TransferFailed,
        });

        // Live and untouched vs live and already failed: the distinction the
        // status exists to make, since only the second is actionable.
        let live = record(TipState::Reserved, now + ONE_SEC);
        assert_eq!(live.status(now), TipStatus::Reserved);
        assert_eq!(
            TipRecord {
                last_claim_failure: failure.clone(),
                ..live
            }
            .status(now),
            TipStatus::Failed
        );

        // Expiry outranks it: past the deadline there is nothing to act on.
        assert_eq!(
            TipRecord {
                last_claim_failure: failure.clone(),
                ..record(TipState::Reserved, now - ONE_SEC)
            }
            .status(now),
            TipStatus::Expired
        );

        // And a tip that failed once, then paid out, reads as Claimed — while
        // still carrying the failure, so History can say it was not first time
        // lucky.
        let claimed = TipRecord {
            last_claim_failure: failure.clone(),
            ..record(
                TipState::Claimed {
                    claimer: principal(2),
                    block_index: Nat::from(1u64),
                    claimed_at_ns: now,
                },
                now + ONE_SEC,
            )
        };
        assert_eq!(claimed.status(now), TipStatus::Claimed);
        assert_eq!(
            claimed.to_my_tip("t".to_string(), now).last_claim_failure,
            failure
        );

        assert_eq!(
            TipRecord {
                last_claim_failure: failure,
                ..record(TipState::Cancelled, now + ONE_SEC)
            }
            .status(now),
            TipStatus::Cancelled
        );
    }

    #[test]
    fn claimed_and_cancelled_are_terminal() {
        let claimed = record(
            TipState::Claimed {
                claimer: principal(2),
                block_index: Nat::from(7u64),
                claimed_at_ns: 50,
            },
            100,
        );
        assert!(!claimed.is_claimable(99));
        assert_eq!(claimed.status(99), TipStatus::Claimed);
        assert_eq!(
            claimed.status(101),
            TipStatus::Claimed,
            "a claimed tip does not become Expired once its deadline passes"
        );
        assert_eq!(claimed.claimed_by(), Some(principal(2)));

        let cancelled = record(TipState::Cancelled, 100);
        assert!(!cancelled.is_claimable(99));
        assert_eq!(cancelled.status(99), TipStatus::Cancelled);
        assert_eq!(cancelled.claimed_by(), None);
    }

    #[test]
    fn an_in_flight_claim_blocks_others_until_it_times_out() {
        let started = 1_000 * ONE_SEC;
        let tip = record(
            TipState::Claiming {
                claimer: principal(2),
                started_at_ns: started,
            },
            started + MAX_TIP_EXPIRY_NS,
        );

        assert!(tip.has_claim_in_flight(started));
        assert!(
            !tip.is_claimable(started),
            "no second payout while in flight"
        );
        assert!(tip.has_claim_in_flight(started + TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS - 1));

        // Past the window, a fresh claim may take over — otherwise a claim
        // interrupted by an upgrade would strand the tip forever.
        assert!(!tip.has_claim_in_flight(started + TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS));
        assert!(tip.is_claimable(started + TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS));

        assert_eq!(
            tip.status(started),
            TipStatus::Reserved,
            "an attempt is not a payout: History still reads Reserved"
        );
    }

    /// What a retry is allowed to change, and what it is not.
    ///
    /// The in-flight guard has to move with each attempt — that is how a claim
    /// whose reply never came back stops blocking the tip. The payout's
    /// `created_at_time` has to do the opposite: if it moved with the attempt,
    /// the retry would be a *different* transaction, the ledger would have
    /// nothing to match it against, and the one thing the stamp exists to buy
    /// would be gone. Both live on the same record, which is why this is worth
    /// nailing down.
    #[test]
    fn a_retry_keeps_the_payout_stamp_and_moves_only_the_in_flight_guard() {
        let claimer = principal(2);
        let first_attempt = 1_000 * ONE_SEC;
        let tip = record(TipState::Reserved, first_attempt + MAX_TIP_EXPIRY_NS);

        let (claiming, pinned) = tip.start_claim(claimer, first_attempt);
        assert_eq!(pinned, first_attempt, "the first attempt sets the stamp");
        assert_eq!(claiming.payout_created_at_ns, Some(first_attempt));

        // The attempt lapses and the tip goes back into the pool, carrying the
        // stamp with it — exactly what `release_claim` writes.
        let released = TipRecord {
            state: TipState::Reserved,
            ..claiming
        };

        let retry = first_attempt + TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS;
        let (retried, reused) = released.start_claim(claimer, retry);
        assert_eq!(
            reused, first_attempt,
            "a retry sends the first attempt's transaction, or the ledger cannot \
             tell it is the same one"
        );
        assert_eq!(retried.payout_created_at_ns, Some(first_attempt));
        assert!(
            matches!(
                retried.state,
                TipState::Claiming { started_at_ns, .. } if started_at_ns == retry
            ),
            "while the in-flight guard restarts, so the next takeover is timed \
             from this attempt and not the first"
        );

        // A different claimer inherits it harmlessly: their `to` account already
        // makes their payout a different transaction.
        let (_, inherited) = TipRecord {
            state: TipState::Reserved,
            ..retried.clone()
        }
        .start_claim(principal(3), retry + ONE_SEC);
        assert_eq!(inherited, first_attempt);
    }

    /// Past the ledger's window a pinned stamp is worse than none: it would be
    /// answered `TooOld` on every attempt, leaving a live tip permanently
    /// unclaimable. Renewing costs the deduplication the stamp bought, which is
    /// the honest price of a ledger that no longer remembers.
    #[test]
    fn a_payout_stamp_is_renewed_once_the_ledger_can_no_longer_match_it() {
        let claimer = principal(2);
        let first_attempt = 1_000 * ONE_SEC;
        let tip = record(TipState::Reserved, first_attempt + MAX_TIP_EXPIRY_NS);
        let (claiming, _) = tip.start_claim(claimer, first_attempt);
        let released = TipRecord {
            state: TipState::Reserved,
            ..claiming
        };

        let last_moment = first_attempt + TIP_PAYOUT_DEDUP_WINDOW_NS - 1;
        assert_eq!(
            released.clone().start_claim(claimer, last_moment).1,
            first_attempt,
            "inside the window the stamp still stands"
        );

        let past_it = first_attempt + TIP_PAYOUT_DEDUP_WINDOW_NS;
        let (renewed, fresh) = released.clone().start_claim(claimer, past_it);
        assert_eq!(fresh, past_it, "the boundary is where it is renewed");
        assert_eq!(renewed.payout_created_at_ns, Some(past_it));

        // And a stamp the ledger refused outright is retired by `release_claim`,
        // which lands here as a record with none.
        let retired = TipRecord {
            state: TipState::Reserved,
            payout_created_at_ns: None,
            ..released
        };
        let within_the_window = first_attempt + ONE_SEC;
        assert_eq!(
            retired.start_claim(claimer, within_the_window).1,
            within_the_window,
            "a retired stamp is never resurrected, however recent it was"
        );
    }

    #[test]
    fn an_expired_tip_has_no_claim_in_flight() {
        let tip = record(
            TipState::Claiming {
                claimer: principal(2),
                started_at_ns: 100,
            },
            200,
        );
        assert!(tip.has_claim_in_flight(150));
        assert!(
            !tip.has_claim_in_flight(200),
            "once expired there is nothing left to be in flight for"
        );
    }

    #[test]
    fn the_anonymous_preview_carries_no_message_and_the_claim_review_does() {
        let tip = record(TipState::Reserved, 100);
        let public = tip.to_public();
        assert_eq!(public.amount, Nat::from(1_000u64));
        assert_eq!(public.expires_at_ns, 100);

        let details = tip.to_details();
        assert_eq!(details.message, Some("thanks!".to_string()));

        let mine = tip.to_my_tip("tip-1".to_string(), 99);
        assert_eq!(mine.tip_id, "tip-1");
        assert_eq!(mine.status, TipStatus::Reserved);
        assert_eq!(mine.claimed_by, None);
    }
}
