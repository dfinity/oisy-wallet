//! ICRC-1/2 calls for arbitrary token ledgers.
//!
//! The **types** come from `ic_cycles_ledger_client`, which re-exports the
//! generated ICRC shapes. They are the standard ones and identical on the wire,
//! and `signer/service.rs` already imports `Account` and `AllowanceArgs` from
//! there — so declaring a second copy here bought nothing.
//!
//! The **calls** stay local, for two reasons that survive that:
//!
//! - `CyclesLedgerService` uses `Call::bounded_wait` throughout. A payout is the one call in this
//!   feature that must not come back "maybe": a bounded wait that times out leaves the canister
//!   unable to say whether money moved, and the claim state machine has nothing safe to do with
//!   that answer. These use `unbounded_wait`.
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
// speaks to the ledger, rather than reaching into a crate named for the cycles
// ledger to talk to an arbitrary token one.
pub use ic_cycles_ledger_client::{
    Account, Allowance, AllowanceArgs, TransferFromArgs, TransferFromError,
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

/// Moves tokens from the sender's account to the claimer's, drawing on the
/// per-tip allowance. The ledger charges its fee to the allowance, not to the
/// transferred amount, so the claimer receives `args.amount` in full.
///
/// # Errors
/// [`TransferFromCallError::InsufficientAllowance`] when the reservation no
/// longer covers the payout; [`TransferFromCallError::Failed`] for any other
/// ledger rejection or transport failure.
pub async fn transfer_from(
    ledger: Principal,
    args: TransferFromArgs,
) -> Result<Nat, TransferFromCallError> {
    let response = Call::unbounded_wait(ledger, "icrc2_transfer_from")
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
