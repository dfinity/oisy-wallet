//! Code for inetracting with the chain fusion signer.
use crate::state::{CYCLES_LEDGER, SIGNER};
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cycles_ledger_client::{Account, ApproveArgs, ApproveError, Service as CyclesLedgerService};
use ic_ledger_types::Subaccount;
use serde_bytes::ByteBuf;

#[derive(CandidType, Deserialize, Debug, Clone, Eq, PartialEq)]
pub enum AllowSigningError {
    Other(String),
    FailedToContactCyclesLedger,
    ApproveError(ApproveError),
}

/// Current ledger fee in cycles.  Historically stable.
///
/// <https://github.com/dfinity/cycles-ledger/blob/1de0e55c6d4fba4bde3e81547e5726df92b881dc/cycles-ledger/src/config.rs#L6>
const LEDGER_FEE: u64 = 1_000_000_000u64;
/// Typical signer fee in cycles.  Unstable and subject to change.
/// Note:
/// - The endpoint prices can be seen here: <https://github.com/dfinity/chain-fusion-signer/blob/main/src/signer/canister/src/lib.rs>
/// - At the time of writing, the endpoint prices in the chain fusion signer repo are placeholders.  Initial measurements indicate that a typical real fee will be about 80T.
/// - PAPI is likely to offer an endpoint returning a pricelist in future, so we can periodically check the price and adjust this value.
const SIGNER_FEE: u64 = 80_000_000_000;
/// A reasonable number of signing operations per user per login.
///
/// Projected uses:
/// - Getting Ethereum address (1x per login)
/// - Getting Bitcoin address (1x per login)
/// - Signing operations (10x per login)
///
/// Margin of error: 3x (given  that the signer fee is subject to change in the next few days and weeks)
const SIGNING_OPS_PER_LOGIN: u64 = 36;
const fn per_user_cycles_allowance() -> u64 {
    // Creating the allowance costs 1 ledger fee.
    // Every usage costs 1 ledger fee + 1 signer fee.
    LEDGER_FEE + (LEDGER_FEE + SIGNER_FEE) * SIGNING_OPS_PER_LOGIN
}

/// Enables the user to sign transactions.
///
/// Signing costs cycles.  Managing that cycle payment can be painful so we take care of that.
pub async fn allow_signing() -> Result<(), AllowSigningError> {
    let cycles_ledger: Principal = *CYCLES_LEDGER;
    let signer: Principal = *SIGNER;
    let caller = ic_cdk::caller();
    let amount = Nat::from(per_user_cycles_allowance());
    CyclesLedgerService(cycles_ledger)
        .icrc_2_approve(&ApproveArgs {
            spender: Account {
                owner: signer,
                subaccount: Some(principal2account(&caller)),
            },
            amount,
            created_at_time: None,
            expected_allowance: None,
            expires_at: None,
            fee: None,
            from_subaccount: None,
            memo: None,
        })
        .await
        .map_err(|_| AllowSigningError::FailedToContactCyclesLedger)?
        .0
        .map_err(AllowSigningError::ApproveError)?;
    Ok(())
}

const SUB_ACCOUNT_ZERO: Subaccount = Subaccount([0; 32]);
#[must_use]
pub fn principal2account(principal: &Principal) -> ByteBuf {
    // Note: The AccountIdentifier type contains bytes but has no API to access them.
    // There is a ticket to address this here: https://github.com/dfinity/cdk-rs/issues/519
    // TODO: Simplify this when an API that provides bytes is available.
    let hex_str = ic_ledger_types::AccountIdentifier::new(principal, &SUB_ACCOUNT_ZERO).to_hex();
    hex::decode(&hex_str)
        .unwrap_or_else(|_| {
            unreachable!(
                "Failed to decode hex account identifier we just created: {}",
                hex_str
            )
        })
        .into()
}
