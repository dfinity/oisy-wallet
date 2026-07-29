//! Code for interacting with the chain fusion signer.
use bitcoin::{Address, CompressedPublicKey, Network};
use candid::{Nat, Principal};
use ic_cdk::{
    api::msg_caller,
    bitcoin_canister::Network as BitcoinNetwork,
    call::Call,
    management_canister::{
        canister_status, ecdsa_public_key, schnorr_public_key, CanisterStatusArgs, EcdsaCurve,
        EcdsaKeyId, EcdsaPublicKeyArgs, SchnorrAlgorithm, SchnorrKeyId, SchnorrPublicKeyArgs,
    },
};
use ic_cycles_ledger_client::{
    Account, AllowanceArgs, ApproveArgs, CyclesLedgerService, DepositArgs, DepositResult,
};
use ic_ledger_types::Subaccount;
use serde_bytes::ByteBuf;
use shared::types::signer::{
    topup::{
        TopUpCyclesLedgerError, TopUpCyclesLedgerRequest, TopUpCyclesLedgerResponse,
        TopUpCyclesLedgerResult,
    },
    AllowSigningError, GetAllowedCyclesError,
};
use tiny_keccak::{Hasher, Keccak};

use super::canister_ids::{CYCLES_LEDGER, SIGNER};
use crate::state::read_config;

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
            owner: ic_cdk::api::canister_self(),
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

/// Returns `Some(allowance)` when the caller's current cycles allowance is
/// at or above [`SUFFICIENT_CYCLES_THRESHOLD`], meaning a new `icrc_2_approve`
/// is unnecessary.
///
/// Returns `None` when the allowance is below threshold **or** when the
/// cycles ledger cannot be contacted (conservative fallback).
pub async fn has_sufficient_allowance() -> Option<Nat> {
    match get_allowed_cycles().await {
        Ok(current) if current >= SUFFICIENT_CYCLES_THRESHOLD => Some(current),
        _ => None,
    }
}

/// Unconditionally creates a new `icrc_2_approve` for signing operations,
/// **without** checking the current allowance first.
///
/// Callers that want the "check first, approve only if needed" behaviour
/// should call [`has_sufficient_allowance`] beforehand, or use
/// [`allow_signing`] which does both.
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`
pub async fn approve_signing() -> Result<(), AllowSigningError> {
    let cycles_ledger: Principal = *CYCLES_LEDGER;
    let signer: Principal = *SIGNER;
    let caller = msg_caller();

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

/// Enables the user to sign transactions.
///
/// Checks the current allowance first; if already at or above
/// [`SUFFICIENT_CYCLES_THRESHOLD`], returns immediately without making an
/// `icrc_2_approve` call.  Otherwise delegates to [`approve_signing`].
///
/// # Errors
/// Errors are enumerated by: `AllowSigningError`
pub async fn allow_signing() -> Result<(), AllowSigningError> {
    if has_sufficient_allowance().await.is_some() {
        return Ok(());
    }

    approve_signing().await
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

/// The caller's default-subaccount ICP account identifier as a lowercase hex string — the form
/// `OnRamper` expects and the one the frontend shows as `$icpAccountIdentifierText`. Returns the
/// hex directly, avoiding the hex → bytes → hex round-trip (and its panic surface) of
/// [`principal2account`].
pub fn principal_to_account_identifier_hex(principal: &Principal) -> String {
    ic_ledger_types::AccountIdentifier::new(principal, &SUB_ACCOUNT_ZERO).to_hex()
}

// Chain-fusion-signer derivation-path schema bytes — the first path element that namespaces a
// principal's key per chain, mirrored so reproducing the path via the management canister (with
// `canister_id = cfs_canister_id`) yields the same key the signer derives.
// ECDSA schemas: see <https://github.com/dfinity/chain-fusion-signer/blob/26b683c6de9971fdbf7bd4cebc04d427d1753289/src/signer/canister/src/derivation_path.rs#L6>.
const SCHEMA_BTC: u8 = 0x00;
const SCHEMA_ETH: u8 = 0x01;
// Schnorr (Ed25519) schema used for Solana, mirrored from the frontend's offline derivation
// (`src/frontend/src/lib/ic-pub-key/src/cli.ts`, `deriveSolAddress`).
const SCHEMA_SOL: u8 = 0xfe;

/// Computes the secp256k1 public key the chain-fusion signer would derive for `principal` under the
/// given `schema` (`SCHEMA_BTC` / `SCHEMA_ETH`), via the management canister — a public-key read,
/// not a signing call, so it does not consume the signer's signing allowance.
// TODO: Cache CFS pubkey and derive it offline as in [ckBTC minter](https://github.com/dfinity/ic/blob/35153c7cb7b9d1da60472ca7e94c693e418f87bd/rs/bitcoin/ckbtc/minter/src/address.rs#L101-L101)
async fn cfs_ecdsa_pubkey_of(principal: &Principal, schema: u8) -> Result<Vec<u8>, String> {
    let (ecdsa_key_name, maybe_cfs_canister_id) =
        read_config(|s| (s.ecdsa_key_name.clone(), s.cfs_canister_id));
    let derivation_path = vec![vec![schema], principal.as_slice().to_vec()];
    let cfs_canister_id = maybe_cfs_canister_id.ok_or("Missing CFS canister id")?;
    let key = ecdsa_public_key(&EcdsaPublicKeyArgs {
        canister_id: Some(cfs_canister_id),
        derivation_path,
        key_id: EcdsaKeyId {
            curve: EcdsaCurve::Secp256k1,
            name: ecdsa_key_name,
        },
    })
    .await
    .map_err(|_| "Failed to get ecdsa public key".to_string())?;
    Ok(key.public_key)
}

/// Computes the Ed25519 public key the chain-fusion signer would derive for `principal` on the
/// Solana mainnet path, via the management canister `schnorr_public_key` (a public-key read, not a
/// signing call). Mirrors the signer's path: `[SCHEMA_SOL, principal, "SOL", "mainnet"]`.
async fn cfs_ed25519_pubkey_of(principal: &Principal) -> Result<Vec<u8>, String> {
    let (key_name, maybe_cfs_canister_id) =
        read_config(|s| (s.ecdsa_key_name.clone(), s.cfs_canister_id));
    let derivation_path = vec![
        vec![SCHEMA_SOL],
        principal.as_slice().to_vec(),
        b"SOL".to_vec(),
        b"mainnet".to_vec(),
    ];
    let cfs_canister_id = maybe_cfs_canister_id.ok_or("Missing CFS canister id")?;
    let key = schnorr_public_key(&SchnorrPublicKeyArgs {
        canister_id: Some(cfs_canister_id),
        derivation_path,
        key_id: SchnorrKeyId {
            algorithm: SchnorrAlgorithm::Ed25519,
            name: key_name,
        },
    })
    .await
    .map_err(|_| "Failed to get schnorr public key".to_string())?;
    Ok(key.public_key)
}

fn transform_network(network: BitcoinNetwork) -> Network {
    match network {
        BitcoinNetwork::Mainnet => Network::Bitcoin,
        BitcoinNetwork::Testnet => Network::Testnet,
        BitcoinNetwork::Regtest => Network::Regtest,
    }
}

/// Converts a public key to a P2PKH address.
///
/// # Errors
/// - It was not possible to get the P2WPKH from the public key.
pub async fn btc_principal_to_p2wpkh_address(
    network: BitcoinNetwork,
    principal: &Principal,
) -> Result<String, String> {
    let ecdsa_pubkey = cfs_ecdsa_pubkey_of(principal, SCHEMA_BTC).await?;
    if let Ok(compressed_public_key) = CompressedPublicKey::from_slice(&ecdsa_pubkey) {
        Ok(Address::p2wpkh(&compressed_public_key, transform_network(network)).to_string())
    } else {
        Err("Error getting P2WPKH from public key".to_string())
    }
}

/// Derives the caller's Ethereum address from their principal, reproducing the chain-fusion
/// signer's key via the management canister (no signer call).
///
/// # Errors
/// - The signer public key could not be retrieved, or the bytes are not a valid secp256k1 key.
pub async fn eth_principal_to_address(principal: &Principal) -> Result<String, String> {
    let ecdsa_pubkey = cfs_ecdsa_pubkey_of(principal, SCHEMA_ETH).await?;
    eth_address_from_ecdsa_pubkey(&ecdsa_pubkey)
}

/// Derives the caller's Solana (mainnet) address from their principal, reproducing the chain-fusion
/// signer's Ed25519 key via the management canister (no signer call).
///
/// # Errors
/// - The signer public key could not be retrieved, or it is not a 32-byte Ed25519 key.
pub async fn sol_principal_to_address(principal: &Principal) -> Result<String, String> {
    let ed25519_pubkey = cfs_ed25519_pubkey_of(principal).await?;
    sol_address_from_ed25519_pubkey(&ed25519_pubkey)
}

/// Keccak-256 of `data`. This is Ethereum's hash function — the original Keccak, **not** the
/// NIST-standardized SHA-3 (they differ in padding). Used for both the address derivation and the
/// EIP-55 checksum below.
fn keccak256(data: &[u8]) -> [u8; 32] {
    let mut hasher = Keccak::v256();
    let mut output = [0u8; 32];
    hasher.update(data);
    hasher.finalize(&mut output);
    output
}

/// Encodes a 20-byte address as an EIP-55 mixed-case checksum string (with `0x` prefix): a hex
/// letter is uppercased when the corresponding nibble of the Keccak-256 of the lowercase hex is `>=
/// 8`. See <https://eips.ethereum.org/EIPS/eip-55>. Takes a fixed `[u8; 20]` so the `hash[i / 2]`
/// indexing below can never run past the 32-byte Keccak output (40 hex chars → max index 19).
fn to_eip55_checksum(address: &[u8; 20]) -> String {
    let hex_addr = hex::encode(address);
    let hash = keccak256(hex_addr.as_bytes());
    let mut out = String::with_capacity(2 + hex_addr.len());
    out.push_str("0x");
    for (i, c) in hex_addr.char_indices() {
        let nibble = if i % 2 == 0 {
            hash[i / 2] >> 4
        } else {
            hash[i / 2] & 0x0f
        };
        if c.is_ascii_alphabetic() && nibble >= 8 {
            out.push(c.to_ascii_uppercase());
        } else {
            out.push(c);
        }
    }
    out
}

/// Derives the EIP-55-checksummed Ethereum address from a SEC1 secp256k1 public key (compressed or
/// uncompressed). The address is the last 20 bytes of the Keccak-256 of the 64-byte uncompressed
/// public key, excluding the leading `0x04` SEC1 tag.
///
/// # Errors
/// - The bytes are not a valid secp256k1 public key.
pub(crate) fn eth_address_from_ecdsa_pubkey(pubkey: &[u8]) -> Result<String, String> {
    let public_key = bitcoin::secp256k1::PublicKey::from_slice(pubkey)
        .map_err(|e| format!("Invalid secp256k1 public key: {e}"))?;
    let uncompressed = public_key.serialize_uncompressed();
    let hash = keccak256(&uncompressed[1..]);
    let mut address = [0u8; 20];
    address.copy_from_slice(&hash[12..]);
    Ok(to_eip55_checksum(&address))
}

/// Derives the Solana address — base58 of the 32-byte Ed25519 public key — from a raw Ed25519
/// public key.
///
/// # Errors
/// - The public key is not exactly 32 bytes.
pub(crate) fn sol_address_from_ed25519_pubkey(pubkey: &[u8]) -> Result<String, String> {
    if pubkey.len() != 32 {
        return Err(format!(
            "Invalid Ed25519 public key length: expected 32, got {}",
            pubkey.len()
        ));
    }
    Ok(bs58::encode(pubkey).into_string())
}

/// Seconds in a day, used to convert the freezing threshold (a duration) and the idle burn rate
/// (per day) into a cycle amount.
const SECONDS_PER_DAY: u32 = 86_400;

/// The canister's frozen reserve, in cycles.
///
/// The management canister reports `freezing_threshold` as a duration in seconds, not a cycle
/// amount.  The reserve in cycles is what the canister would burn while idle over that duration:
/// `freezing_threshold_secs * idle_cycles_burned_per_day / 86_400` — the same computation the IC
/// uses to decide when a canister is frozen.
fn frozen_reserve_cycles(freezing_threshold_secs: &Nat, idle_cycles_burned_per_day: &Nat) -> Nat {
    freezing_threshold_secs.clone() * idle_cycles_burned_per_day.clone()
        / Nat::from(SECONDS_PER_DAY)
}

/// How many cycles to send to the cycles ledger: `percentage`% of the balance available *above* the
/// frozen reserve.
///
/// Returns zero when the canister is at or below its frozen reserve — a canister must never spend
/// into the reserve, so in that case it sends nothing at all.  Because the result is at most
/// `backend_cycles - frozen_reserve`, the canister always retains at least `frozen_reserve`.
fn cycles_to_send(backend_cycles: &Nat, frozen_reserve: &Nat, percentage: u8) -> Nat {
    if backend_cycles <= frozen_reserve {
        return Nat::from(0u32);
    }
    let available_above_reserve = backend_cycles.clone() - frozen_reserve.clone();
    available_above_reserve * Nat::from(percentage) / Nat::from(100u32)
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
        owner: ic_cdk::api::canister_self(),
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
    let backend_cycles = Nat::from(ic_cdk::api::canister_cycle_balance());

    // If the ledger balance is low, send cycles:
    if ledger_balance < request.threshold() {
        // The canister must never spend into its frozen reserve: sending a fraction of the *total*
        // balance can push a canister with a large freezing threshold (some run at ~40T) to or
        // below its freeze line.  Base the send on the balance available *above* the
        // reserve instead.
        //
        // `freezing_threshold` from the management canister is a duration in seconds, not a cycle
        // amount, so the reserve in cycles is derived from the idle burn rate — the same way the IC
        // itself computes it.
        let status = match canister_status(&CanisterStatusArgs {
            canister_id: ic_cdk::api::canister_self(),
        })
        .await
        .map_err(|_| TopUpCyclesLedgerError::CouldNotTopUpCyclesLedger {
            available: backend_cycles.clone(),
            tried_to_send: Nat::from(0u32),
        }) {
            Ok(status) => status,
            Err(err) => return TopUpCyclesLedgerResult::Err(err),
        };
        let frozen_reserve = frozen_reserve_cycles(
            &status.settings.freezing_threshold,
            &status.idle_cycles_burned_per_day,
        );

        // Decide how many cycles to keep and how many to send to the cycles ledger.
        let to_send = cycles_to_send(&backend_cycles, &frozen_reserve, request.percentage());

        // At or below the frozen reserve there is nothing safe to send; skip the deposit entirely
        // rather than making a zero-cycle inter-canister call.
        let zero = Nat::from(0u32);
        if to_send == zero {
            return Ok(TopUpCyclesLedgerResponse {
                ledger_balance,
                backend_cycles,
                topped_up: zero,
            })
            .into();
        }

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
        let result: DepositResult = match Call::unbounded_wait(*CYCLES_LEDGER, "deposit")
            .with_args(&(arg,))
            .with_cycles(to_send_128)
            .await
            .map_err(|_| TopUpCyclesLedgerError::CouldNotTopUpCyclesLedger {
                available: backend_cycles.clone(),
                tried_to_send: to_send.clone(),
            })
            .and_then(|r| {
                r.candid()
                    .map_err(|_| TopUpCyclesLedgerError::CouldNotTopUpCyclesLedger {
                        available: backend_cycles,
                        tried_to_send: to_send.clone(),
                    })
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

#[cfg(test)]
mod tests {
    use candid::{Nat, Principal};
    use ic_ledger_types::{AccountIdentifier, DEFAULT_SUBACCOUNT};
    use pretty_assertions::assert_eq;

    use super::{
        cycles_to_send, eth_address_from_ecdsa_pubkey, frozen_reserve_cycles,
        principal_to_account_identifier_hex, sol_address_from_ed25519_pubkey,
    };

    /// 1 trillion cycles (1T), the unit the examples are written in.
    const T: u128 = 1_000_000_000_000;

    // secp256k1 private key `1` — a canonical known-answer vector. Its public key derives the
    // Ethereum address 0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf (widely published).
    const PRIV_KEY_ONE_COMPRESSED_PUBKEY: &str =
        "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798";
    const PRIV_KEY_ONE_UNCOMPRESSED_PUBKEY: &str = "0479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8";
    const PRIV_KEY_ONE_ETH_ADDRESS: &str = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";

    fn hex_to_bytes(s: &str) -> Vec<u8> {
        hex::decode(s).expect("valid hex test vector")
    }

    #[test]
    fn eth_address_from_compressed_pubkey_matches_known_vector() {
        let address =
            eth_address_from_ecdsa_pubkey(&hex_to_bytes(PRIV_KEY_ONE_COMPRESSED_PUBKEY)).unwrap();

        // The address is correctly derived AND EIP-55 checksummed (mixed case).
        assert_eq!(address, PRIV_KEY_ONE_ETH_ADDRESS);
    }

    #[test]
    fn eth_address_is_independent_of_pubkey_sec1_encoding() {
        let from_compressed =
            eth_address_from_ecdsa_pubkey(&hex_to_bytes(PRIV_KEY_ONE_COMPRESSED_PUBKEY)).unwrap();
        let from_uncompressed =
            eth_address_from_ecdsa_pubkey(&hex_to_bytes(PRIV_KEY_ONE_UNCOMPRESSED_PUBKEY)).unwrap();

        assert_eq!(from_compressed, from_uncompressed);
    }

    #[test]
    fn eth_address_rejects_invalid_pubkey() {
        assert!(eth_address_from_ecdsa_pubkey(&[0x00, 0x01, 0x02]).is_err());
    }

    #[test]
    fn principal_to_account_identifier_hex_uses_the_default_subaccount() {
        let principal =
            Principal::from_text("xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae")
                .expect("valid principal");

        let account_id = principal_to_account_identifier_hex(&principal);

        assert_eq!(
            account_id,
            AccountIdentifier::new(&principal, &DEFAULT_SUBACCOUNT).to_hex()
        );
    }

    #[test]
    fn sol_address_of_zero_pubkey_is_the_known_base58_string() {
        // base58 of 32 zero bytes is 32 '1's — the Solana System Program id.
        let address = sol_address_from_ed25519_pubkey(&[0u8; 32]).unwrap();

        assert_eq!(address, "1".repeat(32));
    }

    #[test]
    fn sol_address_base58_round_trips_to_the_pubkey() {
        let pubkey: [u8; 32] = core::array::from_fn(|i| u8::try_from(i).unwrap());

        let address = sol_address_from_ed25519_pubkey(&pubkey).unwrap();
        let decoded = bs58::decode(&address).into_vec().unwrap();

        assert_eq!(decoded, pubkey);
    }

    #[test]
    fn sol_address_rejects_wrong_length_pubkey() {
        assert!(sol_address_from_ed25519_pubkey(&[0u8; 31]).is_err());
        assert!(sol_address_from_ed25519_pubkey(&[0u8; 33]).is_err());
    }

    #[test]
    fn frozen_reserve_is_burn_rate_scaled_by_threshold_days() {
        // 30-day threshold at a burn rate of 2T/day → 60T reserve.
        let reserve = frozen_reserve_cycles(&Nat::from(30u32 * 86_400), &Nat::from(2u128 * T));
        assert_eq!(reserve, Nat::from(60u128 * T));
    }

    #[test]
    fn frozen_reserve_is_zero_when_threshold_or_burn_rate_is_zero() {
        assert_eq!(
            frozen_reserve_cycles(&Nat::from(0u32), &Nat::from(2u128 * T)),
            Nat::from(0u32)
        );
        assert_eq!(
            frozen_reserve_cycles(&Nat::from(30u32 * 86_400), &Nat::from(0u32)),
            Nat::from(0u32)
        );
    }

    #[test]
    fn to_send_uses_only_the_balance_above_the_reserve() {
        // The motivating example: 80T balance, 40T reserve, default 50%.
        // Old behaviour sent 40T (50% of total); now it sends 20T (50% of the 40T surplus).
        let to_send = cycles_to_send(&Nat::from(80u128 * T), &Nat::from(40u128 * T), 50);
        assert_eq!(to_send, Nat::from(20u128 * T));
    }

    #[test]
    fn to_send_always_leaves_at_least_the_reserve() {
        let backend_cycles = Nat::from(80u128 * T);
        let reserve = Nat::from(40u128 * T);
        let to_send = cycles_to_send(&backend_cycles, &reserve, 50);
        let retained = backend_cycles - to_send;
        assert!(retained >= reserve);
    }

    #[test]
    fn to_send_is_zero_at_or_below_the_reserve() {
        // Exactly at the reserve.
        assert_eq!(
            cycles_to_send(&Nat::from(40u128 * T), &Nat::from(40u128 * T), 50),
            Nat::from(0u32)
        );
        // Below the reserve.
        assert_eq!(
            cycles_to_send(&Nat::from(30u128 * T), &Nat::from(40u128 * T), 50),
            Nat::from(0u32)
        );
    }

    #[test]
    fn to_send_just_above_the_reserve_sends_a_fraction_of_the_small_surplus() {
        // 40T + 10T surplus, 50% → 5T sent, reserve fully retained.
        let to_send = cycles_to_send(&Nat::from(50u128 * T), &Nat::from(40u128 * T), 50);
        assert_eq!(to_send, Nat::from(5u128 * T));
    }
}
