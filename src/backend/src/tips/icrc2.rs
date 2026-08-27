//! Minimal ICRC-1/2 client for arbitrary token ledgers.
//!
//! The repo's existing ledger client (`src/cycles_ledger`) speaks the cycles
//! ledger's dialect — `icrc_2_approve`, with underscores — so it cannot be
//! pointed at a token ledger. These are the standard `icrc2_*` methods, with
//! only the fields tips actually needs.
//!
//! Deliberately **not** in `shared::types`: those types are exported into
//! `backend.did`, and the ledger wire format is an implementation detail of
//! this canister, not part of its public interface.

use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::call::Call;
use serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Account {
    pub owner: Principal,
    pub subaccount: Option<ByteBuf>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct AllowanceArgs {
    pub account: Account,
    pub spender: Account,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct Allowance {
    pub allowance: Nat,
    pub expires_at: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct TransferFromArgs {
    /// The subaccount of *this canister* the allowance was granted to. Omitting
    /// it addresses the bare-principal allowance, which for tips is always
    /// empty — every tip's allowance sits under its own subaccount.
    pub spender_subaccount: Option<ByteBuf>,
    pub from: Account,
    pub to: Account,
    pub amount: Nat,
    pub fee: Option<Nat>,
    pub memo: Option<ByteBuf>,
    pub created_at_time: Option<u64>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferFromError {
    BadFee { expected_fee: Nat },
    BadBurn { min_burn_amount: Nat },
    InsufficientFunds { balance: Nat },
    InsufficientAllowance { allowance: Nat },
    TooOld,
    CreatedInFuture { ledger_time: u64 },
    Duplicate { duplicate_of: Nat },
    TemporarilyUnavailable,
    GenericError { error_code: Nat, message: String },
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum TransferFromResult {
    Ok(Nat),
    Err(TransferFromError),
}

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

    match response.candid::<TransferFromResult>().map_err(|err| {
        TransferFromCallError::Failed(format!("icrc2_transfer_from decode failed: {err:?}"))
    })? {
        TransferFromResult::Ok(block_index) => Ok(block_index),
        TransferFromResult::Err(TransferFromError::InsufficientAllowance { .. }) => {
            Err(TransferFromCallError::InsufficientAllowance)
        }
        TransferFromResult::Err(TransferFromError::InsufficientFunds { .. }) => {
            Err(TransferFromCallError::InsufficientFunds)
        }
        TransferFromResult::Err(err) => Err(TransferFromCallError::Failed(format!("{err:?}"))),
    }
}
