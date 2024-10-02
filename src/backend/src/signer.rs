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

/// Enables the user to sign transactions.
///
/// Signing costs cycles.  Managing that cycle payment can be painful so we take care of that.
pub async fn allow_signing() -> Result<(), AllowSigningError> {
    let cycles_ledger: Principal = *CYCLES_LEDGER;
    let signer: Principal = *SIGNER;
    let caller = ic_cdk::caller();
    let expected_fee = 1_000_000_000u64;
    let amount = Nat::from(100 * expected_fee);
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
