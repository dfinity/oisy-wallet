//! Code for interacting with the chain fusion signer.
use bitcoin::{Address, CompressedPublicKey, Network};
use candid::{Nat, Principal};
use ic_cdk::api::{
    call::call_with_payment128,
    management_canister::{
        bitcoin::BitcoinNetwork,
        ecdsa::{ecdsa_public_key, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument},
    },
};
use ic_cycles_ledger_client::{
    Account, AllowanceArgs, ApproveArgs, CyclesLedgerService, DepositArgs, DepositResult,
};
use ic_ledger_types::Subaccount;
use serde_bytes::ByteBuf;
use shared::types::signer::GetAllowedCyclesError;
pub(crate) use shared::types::signer::{
    topup::{
        TopUpCyclesLedgerError, TopUpCyclesLedgerRequest, TopUpCyclesLedgerResponse,
        TopUpCyclesLedgerResult,
    },
    AllowSigningError,
};

use crate::{
    read_config,
    state::{CYCLES_LEDGER, SIGNER},
};



/// Minimum cycles allowance below which a new approve is warranted.
///
/// If the caller already has at least this many cycles, `allow_signing`
/// skips the `icrc_2_approve` call.  This avoids:
/// - Unnecessary inter-canister calls when the user still has plenty of cycles.
/// - Accidentally **reducing** an existing higher allowance, since `icrc_2_approve` *sets* (not
///   adds) the value.
///
/// Set to roughly 18 signing operations worth of cycles.
const SUFFICIENT_CYCLES_THRESHOLD: u64 = (LEDGER_FEE + SIGNER_FEE) * 18;

/// Enables the user to sign transactions.
///
/// Signing costs cycles.  Managing that cycle payment can be painful so we take care of that.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`
/// TODO Remove the Option type (that has been added for backward-compatibility)
/// as soon as the `PoW` feature has been stabilized
pub async fn allow_signing(allowed_cycles: Option<u64>) -> Result<(), AllowSigningError> {
    let cycles_ledger: Principal = *CYCLES_LEDGER;
    let signer: Principal = *SIGNER;
    let caller = ic_cdk::caller();

    if let Ok(current) = get_allowed_cycles().await {
        if current >= SUFFICIENT_CYCLES_THRESHOLD {
            return Ok(());
        }
    }

    let amount = Nat::from(allowed_cycles.unwrap_or_else(per_user_cycles_allowance));
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
