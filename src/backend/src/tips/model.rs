//! Pure domain type and invariant checks for tips. No IC calls or state access
//! here — see `service.rs` for orchestration.

use candid::{CandidType, Deserialize, Nat, Principal};
use serde_bytes::ByteBuf;
use sha2::{Digest, Sha256};
use shared::types::tip::{
    MyTip, PublicTip, TipDetails, TipError, TipStatus, MAX_TIPS_PER_USER, MAX_TIP_EXPIRY_NS,
    MAX_TIP_ID_BYTES, MAX_TIP_MESSAGE_CHARS, TIP_CLAIM_CODE_HASH_BYTES,
    TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS,
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
                    TipStatus::Expired
                } else {
                    TipStatus::Reserved
                }
            }
        }
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
