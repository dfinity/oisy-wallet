//! Code for inetracting with the chain fusion signer.
use crate::{
    read_config,
    state::{CYCLES_LEDGER, SIGNER},
};
use bitcoin::{Address, CompressedPublicKey, Network};
use candid::{CandidType, Deserialize, Nat, Principal};
use ic_cdk::api::management_canister::{
    bitcoin::BitcoinNetwork,
    ecdsa::{ecdsa_public_key, EcdsaCurve, EcdsaKeyId, EcdsaPublicKeyArgument},
};
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

/// Computes the public key of the specified principal.
// TODO: Cache CFS pubkey and derive it offline as in [ckBTC minter](https://github.com/dfinity/ic/blob/35153c7cb7b9d1da60472ca7e94c693e418f87bd/rs/bitcoin/ckbtc/minter/src/address.rs#L101-L101)
async fn cfs_ecdsa_pubkey_of(principal: &Principal) -> Result<Vec<u8>, String> {
    let (ecdsa_key_name, maybe_cfs_canister_id) =
        read_config(|s| (s.ecdsa_key_name.clone(), s.cfs_canister_id));
    // As done in [CFS](https://github.com/dfinity/chain-fusion-signer/blob/26b683c6de9971fdbf7bd4cebc04d427d1753289/src/signer/canister/src/derivation_path.rs#L28)
    let derivation_path = vec![vec![0_u8], principal.as_slice().to_vec()];
    let cfs_canister_id = maybe_cfs_canister_id.ok_or("Missing CFS canister id")?;
    if let Ok((key,)) = ecdsa_public_key(EcdsaPublicKeyArgument {
        canister_id: Some(cfs_canister_id),
        derivation_path,
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: ecdsa_key_name,
        },
    })
    .await
    {
        Ok(key.public_key)
    } else {
        Err("Failed to get ecdsa public key".to_string())
    }
}

fn transform_network(network: BitcoinNetwork) -> Network {
    match network {
        BitcoinNetwork::Mainnet => Network::Bitcoin,
        BitcoinNetwork::Testnet => Network::Testnet,
        BitcoinNetwork::Regtest => Network::Regtest,
    }
}

/// Converts a public key to a P2PKH address.
pub async fn btc_principal_to_p2wpkh_address(
    network: BitcoinNetwork,
    principal: &Principal,
) -> Result<String, String> {
    let ecdsa_pubkey = cfs_ecdsa_pubkey_of(principal).await?;
    if let Ok(compressed_public_key) = CompressedPublicKey::from_slice(&ecdsa_pubkey) {
        Ok(Address::p2wpkh(&compressed_public_key, transform_network(network)).to_string())
    } else {
        Err("Error getting P2WPKH from public key".to_string())
    }
}
