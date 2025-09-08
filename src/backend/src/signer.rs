//! Code for interacting with the chain fusion signer.
use bitcoin::{Address, CompressedPublicKey};
use candid::{Nat, Principal};
use ic_cdk::{
    api::{canister_cycle_balance, msg_caller, canister_self},
    bitcoin_canister::Network,
};
use ic_cdk::api::call::call_with_payment128;
use ic_cdk::management_canister::{ecdsa_public_key, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgs};
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

/// Current ledger fee in cycles.  Historically stable.
///
/// <https://github.com/dfinity/cycles-ledger/blob/1de0e55c6d4fba4bde3e81547e5726df92b881dc/cycles-ledger/src/config.rs#L6>
const LEDGER_FEE: u64 = 1_000_000_000u64;
/// Typical signer fee in cycles.  Unstable and subject to change.
/// Note:
/// - The endpoint prices can be seen here: <https://github.com/dfinity/chain-fusion-signer/blob/main/src/signer/canister/src/lib.rs>
/// - At the time of writing, the endpoint prices in the chain fusion signer repo are placeholders.
///   Initial measurements indicate that a typical real fee will be about 80T.
/// - PAPI is likely to offer an endpoint returning a pricelist in future, so we can periodically
///   check the price and adjust this value.
const SIGNER_FEE: u64 = 80_000_000_000;
/// A reasonable number of signing operations per user per login.
///
/// Projected uses:
/// - Getting Ethereum address (1x per login)
/// - Getting Bitcoin address (1x per login)
/// - Signing operations (10x per login)
///
/// Margin of error: 3x (given  that the signer fee is subject to change in the next few days and
/// weeks)
const SIGNING_OPS_PER_LOGIN: u64 = 36;
const fn per_user_cycles_allowance() -> u64 {
    // Creating the allowance costs 1 ledger fee.
    // Every usage costs 1 ledger fee + 1 signer fee.
    LEDGER_FEE + (LEDGER_FEE + SIGNER_FEE) * SIGNING_OPS_PER_LOGIN
}

/// Retrieves the amount of cycles that the signer canister is allowed to spend
/// on behalf of the current canister.
///
/// This function calls `icrc_2_allowance` on the cycles ledger to get the
/// current allowance. The allowance is queried using the current canister
/// identity as the account owner, and the signer canister as the spender,
/// with the caller's principal encoded as the subaccount.
///
/// # Returns
/// - On success: `Ok(Nat)` containing the number of cycles that are allowed to be spent
/// - On failure: `Err(GetAllowedCyclesError)` indicating what went wrong
///
/// # Errors
/// - `FailedToContactCyclesLedger`: If the call to the cycles ledger canister failed
pub async fn get_allowed_cycles() -> Result<Nat, GetAllowedCyclesError> {
    let cycles_ledger: Principal = *CYCLES_LEDGER;
    let signer: Principal = *SIGNER;
    let caller = msg_caller();

    // Create the AllowanceArgs structure as specified in the JSON
    let allowance_args = AllowanceArgs {
        account: Account {
            owner: canister_self(),
            subaccount: None,
        },
        spender: Account {
            owner: signer,
            subaccount: Some(principal2account(&caller)),
        },
    };

    // Call icrc_2_allowance on the CyclesLedgerService
    let (allowance,) = CyclesLedgerService(cycles_ledger)
        .icrc_2_allowance(&allowance_args)
        .await
        .map_err(|_| GetAllowedCyclesError::FailedToContactCyclesLedger)?;

    Ok(allowance.allowance)
}

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
    let caller = msg_caller();
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

/// Computes the public key of the specified principal.
// TODO: Cache CFS pubkey and derive it offline as in [ckBTC minter](https://github.com/dfinity/ic/blob/35153c7cb7b9d1da60472ca7e94c693e418f87bd/rs/bitcoin/ckbtc/minter/src/address.rs#L101-L101)
async fn cfs_ecdsa_pubkey_of(principal: &Principal) -> Result<Vec<u8>, String> {
    let (ecdsa_key_name, maybe_cfs_canister_id) =
        read_config(|s| (s.ecdsa_key_name.clone(), s.cfs_canister_id));
    // As set in [CFS](https://github.com/dfinity/chain-fusion-signer/blob/26b683c6de9971fdbf7bd4cebc04d427d1753289/src/signer/canister/src/derivation_path.rs#L6)
    // 0 is for BTC
    // 1 is for Eth
    // 0xff is generic
    let btc_schema = vec![0_u8];
    let derivation_path = vec![btc_schema, principal.as_slice().to_vec()];
    let cfs_canister_id = maybe_cfs_canister_id.ok_or("Missing CFS canister id")?;

    // Updated for ic-cdk 0.18.0 with proper return type handling
    let arg = EcdsaPublicKeyArgs {
        canister_id: Some(cfs_canister_id),
        derivation_path,
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: ecdsa_key_name,
        },
    };

    let result = ecdsa_public_key(&arg).await;
    match result {
        Ok(response) => Ok(response.public_key),
        Err(err) => Err(format!("Failed to get ECDSA public key: {err}")),
    }
}

fn transform_network(network: Network) -> bitcoin::Network {
    match network {
        Network::Mainnet => bitcoin::Network::Bitcoin,
        Network::Testnet => bitcoin::Network::Testnet,
        Network::Regtest => bitcoin::Network::Regtest,
    }
}

/// Converts a public key to a P2PKH address.
///
/// # Errors
/// - It was not possible to get the P2WPKH from the public key.
pub async fn btc_principal_to_p2wpkh_address(
    network: Network,
    principal: &Principal,
) -> Result<String, String> {
    let ecdsa_pubkey = cfs_ecdsa_pubkey_of(principal).await?;
    if let Ok(compressed_public_key) = CompressedPublicKey::from_slice(&ecdsa_pubkey) {
        Ok(Address::p2wpkh(&compressed_public_key, transform_network(network)).to_string())
    } else {
        Err("Error getting P2WPKH from public key".to_string())
    }
}

/// Tops up the backend canister account on the cycles ledger.
///
/// # Context
/// The backend canister owns two sets of cycles:
///
/// - Cycles in the backend's cycle ledger account.
///   - Cycles in the ledger are like money held in a bank.  You can perform fancy protocols with
///     these funds.
///   - These cycles are used to pay external running costs.  Specifically, the chain fusion signer
///     is paid from the backend cycles ledger account via ICRC approvals.
/// - Cycles attached to the canister itself.
///   - Cycles attached to the canister itself are like cash in your pocket.  You can use it to pay
///     for a coffee but a typical canister cannot do anything complicated with it.
///   - Canister cycles are topped up by a service such as cycleops.
///   - Canister cycles are consumed to pay for operations:
///     - Storage and execution costs for the canister, paid to the Internet Computer.
///     - Funds sent to the cycles ledger account to pay for external costs.
///
/// This function checks the backend account balance on the cycles ledger and, if low, tops it up
/// with cycles taken from the backend canister itself.
///
/// # Errors
/// Errors are enumerated by: `TopUpCyclesLedgerError`
pub async fn top_up_cycles_ledger(request: TopUpCyclesLedgerRequest) -> TopUpCyclesLedgerResult {
    match request.check() {
        Ok(()) => {}
        Err(err) => return TopUpCyclesLedgerResult::Err(err),
    }

    // Cycles ledger account details:
    let cycles_ledger = CyclesLedgerService(*CYCLES_LEDGER);
    let account = Account {
        owner: canister_self(),
        subaccount: None,
    };

    // Backend balance on the cycles ledger:
    let (ledger_balance,): (Nat,) = match cycles_ledger
        .icrc_1_balance_of(&account)
        .await
        .map_err(|_| TopUpCyclesLedgerError::CouldNotGetBalanceFromCyclesLedger)
    {
        Ok(res) => res,
        Err(err) => return TopUpCyclesLedgerResult::Err(err),
    };

    // Cycles directly attached to the backend:
    let backend_cycles = Nat::from(canister_cycle_balance());

    // If the ledger balance is low, send cycles:
    if ledger_balance < request.threshold() {
        // Decide how many cycles to keep and how many to send to the cycles ledger.
        let to_send = backend_cycles.clone() / Nat::from(100u32) * Nat::from(request.percentage());
        let to_retain = backend_cycles.clone() - to_send.clone();

        // Top up the cycles ledger.
        let arg = DepositArgs {
            to: account,
            memo: None,
        };
        let to_send_128: u128 =
            to_send.clone().0.try_into().unwrap_or_else(|err| {
                unreachable!("Failed to convert cycle amount to u128: {}", err)
            });

        let (result,): (DepositResult,) =
            match call_with_payment128(*CYCLES_LEDGER, "deposit", (arg,), to_send_128)
                .await
                .map_err(|_| TopUpCyclesLedgerError::CouldNotTopUpCyclesLedger {
                    available: backend_cycles,
                    tried_to_send: to_send.clone(),
                }) {
                Ok(res) => res,
                Err(err) => return TopUpCyclesLedgerResult::Err(err),
            };


        let new_ledger_balance = result.balance;

        Ok(TopUpCyclesLedgerResponse {
            ledger_balance: new_ledger_balance,
            backend_cycles: to_retain,
            topped_up: to_send,
        })
        .into()
    } else {
        Ok(TopUpCyclesLedgerResponse {
            ledger_balance,
            backend_cycles,
            topped_up: Nat::from(0u32),
        })
        .into()
    }
}
