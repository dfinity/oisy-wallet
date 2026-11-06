//! ICRC-1/2 calls for arbitrary token ledgers.
//!
//! The **types** come from `icrc-ledger-types`, the canonical ICRC crate. It is
//! types only — no client, no transport — so it carries no opinion about how the
//! calls below are made. Its `Subaccount` is `[u8; 32]` rather than a `ByteBuf`,
//! which is the same `blob` on the wire and makes a wrong-length subaccount
//! unrepresentable.
//!
//! The **calls** stay local, for two reasons that survive that:
//!
//! - `CyclesLedgerService` uses `Call::bounded_wait` throughout. The payout does too. It once used
//!   `unbounded_wait`, on the grounds that a payout must not come back "maybe": a wait that times
//!   out leaves the canister unable to say whether money moved. The premise holds; the conclusion
//!   did not follow. The ledger is whichever canister the sender named, and a call that waits
//!   unboundedly keeps its response reservation held until that canister answers — so one that
//!   never answers holds a slice of the backend's cycles indefinitely, and enough slices held at
//!   once leave it unable to make any outgoing call at all, this feature's and every other's.
//!   `claim_tip` has to survive a "maybe" either way: `TIP_CLAIM_IN_FLIGHT_TIMEOUT_NS` lets the
//!   `Claiming` guard lapse while a first `icrc2_transfer_from` may still be in flight, so a second
//!   attempt can overlap the first whatever shape the wait has, and what keeps that safe is the
//!   allowance covering exactly one payout, as `service::claim_tip` says at length. What turns a
//!   "maybe" back into an answer is the payout's `created_at_time`: a retry by the same claimer
//!   inside the ledger's transaction window is the same transaction, which the ledger either
//!   executes once or answers with the block where it already did (see [`transfer_from`]). The
//!   deadline is [`PAYOUT_TIMEOUT_SECONDS`] rather than the `bounded_wait` default of 300 s, which
//!   is far longer than a ledger's answer stays worth having.
//! - That client is a struct bound to one canister and bundles cycles-only methods — `deposit`,
//!   `withdraw`, `create_canister`. Tips points at whatever ledger the sender chose, and needs
//!   three methods.
//!
//! An earlier version of this comment claimed the existing client "speaks the
//! cycles ledger's dialect — `icrc_2_approve`, with underscores". That was
//! wrong: the underscore is in the Rust method name only, and the wire strings
//! there are the standard `icrc2_*`. Recorded because it is the obvious thing to
//! assume, and it is not a reason to write a second client.

use candid::{Nat, Principal};
use ic_cdk::call::{Call, CallFailed, RejectCode};
// Re-exported so callers keep importing the ledger shapes from the module that
// speaks to the ledger.
pub use icrc_ledger_types::{
    icrc1::account::Account,
    icrc2::{
        allowance::{Allowance, AllowanceArgs},
        transfer_from::{TransferFromArgs, TransferFromError},
    },
};

/// Why a payout did not happen.
///
/// The split matters. `InsufficientAllowance` is the sender having reduced or
/// revoked the reservation; `InsufficientFunds` is the reservation still standing
/// with the money gone, which topping up fixes. `Unresolved` is no answer at
/// all, and `TooOld` a stamp the ledger can no longer match. Everything else is
/// `Failed`. All of them leave the tip claimable.
#[derive(Debug)]
pub enum TransferFromCallError {
    InsufficientAllowance,
    /// The sender's balance dropped below the amount. Kept apart from `Failed`
    /// because it is the one failure the sender can fix, and the claimer can be
    /// told to come back rather than just "try again".
    InsufficientFunds,
    /// The deadline passed with no answer. Kept apart from `Failed` because it
    /// is not one: the message may have run, and may still pay. Recording it as
    /// a failure would claim to know something the system does not, and
    /// `service::claim_tip` leans on the difference.
    Unresolved(String),
    /// The payout's `created_at_time` has aged out of the ledger's transaction
    /// window. Kept apart from `Failed` because the caller has to act on it:
    /// the stamp is dead, every retry carrying it is refused the same way, and
    /// the next attempt has to pin a fresh one.
    TooOld,
    Failed(String),
}

/// Whether a call error is the deadline passing rather than an answer.
///
/// `SysUnknown` is the system stating it cannot say whether the callee ran the
/// message — the one outcome that must not be written down as a failure.
fn is_unresolved(err: &CallFailed) -> bool {
    matches!(err, CallFailed::CallRejected(rejected)
        if matches!(rejected.reject_code(), Ok(RejectCode::SysUnknown)))
}

/// Reads the ledger's own answer as the outcome a claim acts on.
///
/// Split out from [`transfer_from`] because every line of it is a decision
/// rather than a call, and a decision is worth testing without a ledger.
///
/// `Duplicate` is a **success**, and the reason the payout carries a
/// `created_at_time` at all. A retry of an attempt whose answer never arrived is
/// the same transaction to the ledger: it is not executed again, and the reply
/// names the block of the one that did land. That block is this tip's payout and
/// nothing else — the transaction's identity covers the per-tip spender
/// subaccount, the sender, the claimer and the amount, so no other transfer can
/// collide with it.
///
/// `TooOld` is the one answer that leaves the outcome genuinely unknown. The
/// stamp has fallen outside the ledger's transaction window, so the ledger can
/// no longer say whether the previous attempt landed, and will refuse every
/// further retry that carries it. `TIP_PAYOUT_DEDUP_WINDOW_NS` is meant to
/// retire a stamp before this happens; reaching it anyway means the ledger's own
/// window is shorter than that, and the caller renews the stamp so the tip stays
/// claimable.
///
/// `CreatedInFuture` is a plain failure and deliberately not special: nothing
/// was written, and the very same stamp is accepted once the ledger's clock
/// passes it, so retrying unchanged is right. `BadFee`, `BadBurn`,
/// `TemporarilyUnavailable` and `GenericError` are failures in the same sense —
/// the ledger refused and nothing moved.
fn classify(response: Result<Nat, TransferFromError>) -> Result<Nat, TransferFromCallError> {
    match response {
        Ok(block_index) => Ok(block_index),
        Err(TransferFromError::Duplicate { duplicate_of }) => Ok(duplicate_of),
        Err(TransferFromError::InsufficientAllowance { .. }) => {
            Err(TransferFromCallError::InsufficientAllowance)
        }
        Err(TransferFromError::InsufficientFunds { .. }) => {
            Err(TransferFromCallError::InsufficientFunds)
        }
        Err(TransferFromError::TooOld) => Err(TransferFromCallError::TooOld),
        Err(err) => Err(TransferFromCallError::Failed(format!("{err:?}"))),
    }
}

/// The ledger's current transfer fee, needed to size the minimum tip and to
/// check that an allowance covers a payout plus its fee.
///
/// # Errors
/// Returns the ledger's own message when the call fails or cannot be decoded.
pub async fn fee(ledger: Principal) -> Result<Nat, String> {
    Call::unbounded_wait(ledger, "icrc1_fee")
        .with_args(&())
        .await
        .map_err(|err| format!("icrc1_fee call failed: {err:?}"))?
        .candid::<Nat>()
        .map_err(|err| format!("icrc1_fee decode failed: {err:?}"))
}

/// The allowance an account has granted to a spender account.
///
/// # Errors
/// Returns the ledger's own message when the call fails or cannot be decoded.
pub async fn allowance(ledger: Principal, args: AllowanceArgs) -> Result<Allowance, String> {
    Call::unbounded_wait(ledger, "icrc2_allowance")
        .with_args(&(args,))
        .await
        .map_err(|err| format!("icrc2_allowance call failed: {err:?}"))?
        .candid::<Allowance>()
        .map_err(|err| format!("icrc2_allowance decode failed: {err:?}"))
}

/// How long a payout waits for the ledger before its outcome counts as unknown.
///
/// A cross-subnet ledger call takes seconds, so thirty is roughly ten times what
/// a healthy answer needs and the point past which the answer has stopped being
/// worth waiting for. It also bounds what one open payout can hold: the cycles
/// the system sets aside for a reply come back at the deadline whether or not
/// the ledger answers, and the `bounded_wait` default of 300 s would hold ten
/// times as many at once for an answer that went stale long before.
const PAYOUT_TIMEOUT_SECONDS: u32 = 30;

/// Moves tokens from the sender's account to the claimer's, drawing on the
/// per-tip allowance. The ledger charges its fee to the allowance, not to the
/// transferred amount, so the claimer receives `args.amount` in full.
///
/// `args.created_at_time` carries the weight here. Set, it makes this call
/// idempotent at the ledger for the length of the ledger's transaction window:
/// a call that times out, traps on the way back, or fails to decode can be sent
/// again unchanged, and the ledger either executes it once or names the block
/// where it already did. Unset, every one of those answers would be
/// indistinguishable from "nothing happened", which is a payout written off as
/// a failure. Callers pin it per tip rather than per attempt — see
/// [`crate::tips::model::TipRecord::start_claim`].
///
/// # Errors
/// [`TransferFromCallError::InsufficientAllowance`] when the reservation no
/// longer covers the payout; [`TransferFromCallError::InsufficientFunds`] when
/// the sender's balance dropped below it; [`TransferFromCallError::Unresolved`]
/// when [`PAYOUT_TIMEOUT_SECONDS`] passes with no answer, leaving the outcome
/// unknown — see the module comment for why the claim state machine can take
/// that answer; [`TransferFromCallError::TooOld`] when the stamp has aged out
/// of the ledger's window; [`TransferFromCallError::Failed`] for any other
/// ledger rejection or transport failure.
pub async fn transfer_from(
    ledger: Principal,
    args: TransferFromArgs,
) -> Result<Nat, TransferFromCallError> {
    let response = Call::bounded_wait(ledger, "icrc2_transfer_from")
        .change_timeout(PAYOUT_TIMEOUT_SECONDS)
        .with_args(&(args,))
        .await
        .map_err(|err| {
            let msg = format!("icrc2_transfer_from call failed: {err:?}");
            if is_unresolved(&err) {
                TransferFromCallError::Unresolved(msg)
            } else {
                TransferFromCallError::Failed(msg)
            }
        })?;

    // `Result` is what candid's `variant { Ok; Err }` decodes into, so the named
    // wrapper enum this used to carry was a third copy of the same shape.
    classify(
        response
            .candid::<Result<Nat, TransferFromError>>()
            .map_err(|err| {
                TransferFromCallError::Failed(format!("icrc2_transfer_from decode failed: {err:?}"))
            })?,
    )
}

#[cfg(test)]
mod tests {
    use ic_cdk::call::{CallPerformFailed, CallRejected, InsufficientLiquidCycleBalance};
    use pretty_assertions::assert_eq;

    use super::*;

    fn nat(value: u64) -> Nat {
        Nat::from(value)
    }

    fn rejected(raw_reject_code: u32) -> CallFailed {
        CallFailed::CallRejected(CallRejected::with_rejection(
            raw_reject_code,
            "rejected".to_string(),
        ))
    }

    /// The case this module exists to get right. A payout whose answer never
    /// came back is retried with the same `created_at_time`; the ledger
    /// recognises it, declines to pay twice, and hands back the block of the
    /// payout that already happened. Reading that as a failure would tell the
    /// claimer the tip was never paid while the money sat in their account.
    #[test]
    fn a_duplicate_is_the_payout_that_already_landed() {
        assert_eq!(
            classify(Err(TransferFromError::Duplicate {
                duplicate_of: nat(42),
            }))
            .expect("a duplicate is a success, not a rejection"),
            nat(42),
            "and it carries the original block, so the claimer gets a real receipt"
        );

        assert_eq!(
            classify(Ok(nat(7))).expect("a plain success stays one"),
            nat(7)
        );
    }

    #[test]
    fn a_stale_stamp_is_kept_apart_from_an_ordinary_refusal() {
        assert!(
            matches!(
                classify(Err(TransferFromError::TooOld)),
                Err(TransferFromCallError::TooOld)
            ),
            "the caller has to renew the stamp, which a `Failed` would not tell it"
        );

        // Not the same thing at all: nothing was written, and the identical
        // transaction is accepted once the ledger's clock catches up.
        assert!(matches!(
            classify(Err(TransferFromError::CreatedInFuture { ledger_time: 1 })),
            Err(TransferFromCallError::Failed(_))
        ));
    }

    #[test]
    fn the_two_refusals_the_sender_can_act_on_keep_their_own_shape() {
        assert!(matches!(
            classify(Err(TransferFromError::InsufficientAllowance {
                allowance: nat(0)
            })),
            Err(TransferFromCallError::InsufficientAllowance)
        ));
        assert!(matches!(
            classify(Err(TransferFromError::InsufficientFunds {
                balance: nat(0)
            })),
            Err(TransferFromCallError::InsufficientFunds)
        ));

        // Everything else collapses into one bucket, carrying the ledger's own
        // words for the canister log.
        assert!(matches!(
            classify(Err(TransferFromError::TemporarilyUnavailable)),
            Err(TransferFromCallError::Failed(_))
        ));
        assert!(matches!(
            classify(Err(TransferFromError::BadFee {
                expected_fee: nat(10_000)
            })),
            Err(TransferFromCallError::Failed(_))
        ));
        assert!(matches!(
            classify(Err(TransferFromError::GenericError {
                error_code: nat(1),
                message: "nope".to_string(),
            })),
            Err(TransferFromCallError::Failed(_))
        ));
    }

    #[test]
    fn a_deadline_with_no_answer_is_unresolved() {
        assert!(is_unresolved(&rejected(RejectCode::SysUnknown as u32)));
    }

    #[test]
    fn an_answer_from_the_ledger_is_never_unresolved() {
        for code in [
            RejectCode::SysFatal,
            RejectCode::SysTransient,
            RejectCode::DestinationInvalid,
            RejectCode::CanisterReject,
            RejectCode::CanisterError,
        ] {
            assert!(!is_unresolved(&rejected(code as u32)), "{code:?}");
        }
    }

    /// A code the CDK cannot name is not a statement that the outcome is
    /// unknown, so it stays a definite failure rather than defaulting into the
    /// one case that keeps a claim held.
    #[test]
    fn a_reject_code_outside_the_known_set_is_not_unresolved() {
        assert!(!is_unresolved(&rejected(99)));
    }

    /// Both of these say the message never reached the ledger, so the payout
    /// certainly did not happen — `InsufficientLiquidCycleBalance` is what an
    /// outgoing call raises once the canister's own liquid balance runs short.
    #[test]
    fn a_call_that_never_left_is_not_unresolved() {
        assert!(!is_unresolved(&CallFailed::CallPerformFailed(
            CallPerformFailed
        )));
        assert!(!is_unresolved(&CallFailed::InsufficientLiquidCycleBalance(
            InsufficientLiquidCycleBalance {
                available: 1,
                required: 2,
            }
        )));
    }
}
