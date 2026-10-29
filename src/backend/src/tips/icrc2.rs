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
//!   allowance covering exactly one payout, as `service::claim_tip` says at length. The deadline is
//!   [`PAYOUT_TIMEOUT_SECONDS`] rather than the `bounded_wait` default of 300 s, which is far
//!   longer than a ledger's answer stays worth having.
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
use ic_cdk::call::Call;
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
/// with the money gone, which topping up fixes. Everything else is `Failed`. All
/// three leave the tip claimable.
#[derive(Debug)]
pub enum TransferFromCallError {
    InsufficientAllowance,
    /// The sender's balance dropped below the amount. Kept apart from `Failed`
    /// because it is the one failure the sender can fix, and the claimer can be
    /// told to come back rather than just "try again".
    InsufficientFunds,
    Failed(String),
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
/// # Errors
/// [`TransferFromCallError::InsufficientAllowance`] when the reservation no
/// longer covers the payout; [`TransferFromCallError::Failed`] for any other
/// ledger rejection or transport failure, [`PAYOUT_TIMEOUT_SECONDS`] included.
/// A payout that reaches the deadline leaves its outcome unknown — see the
/// module comment for why the claim state machine can take that answer.
pub async fn transfer_from(
    ledger: Principal,
    args: TransferFromArgs,
) -> Result<Nat, TransferFromCallError> {
    let response = Call::bounded_wait(ledger, "icrc2_transfer_from")
        .change_timeout(PAYOUT_TIMEOUT_SECONDS)
        .with_args(&(args,))
        .await
        .map_err(|err| {
            TransferFromCallError::Failed(format!("icrc2_transfer_from call failed: {err:?}"))
        })?;

    // `Result` is what candid's `variant { Ok; Err }` decodes into, so the named
    // wrapper enum this used to carry was a third copy of the same shape.
    match response
        .candid::<Result<Nat, TransferFromError>>()
        .map_err(|err| {
            TransferFromCallError::Failed(format!("icrc2_transfer_from decode failed: {err:?}"))
        })? {
        Ok(block_index) => Ok(block_index),
        Err(TransferFromError::InsufficientAllowance { .. }) => {
            Err(TransferFromCallError::InsufficientAllowance)
        }
        Err(TransferFromError::InsufficientFunds { .. }) => {
            Err(TransferFromCallError::InsufficientFunds)
        }
        Err(err) => Err(TransferFromCallError::Failed(format!("{err:?}"))),
    }
}
