//! Deploys a **real** ICRC-1/2 token ledger into a `PocketIc` instance, and
//! talks to it as a client.
//!
//! Tips cannot be tested against a mock: the whole design rests on what a real
//! ledger does with an allowance granted under a spender subaccount — that the
//! subaccount scopes it, and that the fee comes out of the allowance rather than
//! the transferred amount. This is the same `ic-icrc1-ledger` wasm that ckBTC,
//! ckETH and ckUSDC run in production.
//!
//! Note this is *not* the cycles ledger the rest of the suite uses. The
//! difference is the wasm and its install arguments, which is why `InitArgs`,
//! `ArchiveOptions` and `FeatureFlags` are still declared below — they belong to
//! this ledger's `init`, not to any ICRC standard, and no published crate ships
//! them. It is *not* that the cycles ledger speaks a different wire protocol: an
//! earlier version of this comment said it "speaks `icrc_2_approve` with
//! underscores", and the underscore is in a Rust method name, not on the wire.

use std::{env, fs::read};

use candid::{decode_one, encode_one, CandidType, Deserialize, Nat, Principal};
// The ICRC-1/2 shapes come from the canonical crate, the same one the production
// `tips::icrc2` module uses — a second copy here could drift from the encoding
// under test and still pass. Re-exported so callers keep importing the ledger
// shapes from the module that speaks to the ledger.
pub use icrc_ledger_types::{
    icrc1::account::{Account, Subaccount},
    icrc2::{
        allowance::{Allowance, AllowanceArgs},
        approve::{ApproveArgs, ApproveError},
    },
};
use pocket_ic::PocketIc;
use serde_bytes::ByteBuf;

/// Where `scripts/test.backend.sh` leaves the downloaded ledger wasm, relative
/// to the crate root the tests run from.
const DEFAULT_ICRC1_LEDGER_WASM: &str = "../../icrc1-ledger.wasm.gz";

/// The fee every ledger call in these tests is charged. Chosen to be non-zero:
/// a zero fee would hide the very behaviour the tips design depends on, namely
/// that the fee is drawn from the allowance.
pub const TRANSFER_FEE: u64 = 10_000;

/// Cycles for the ledger canister. Archive spawning wants a healthy balance.
const LEDGER_CYCLES: u128 = 2_000_000_000_000;

/// `Account` is foreign now, so these two cannot be inherent constructors. Thin
/// on purpose: they exist to keep the call sites reading as one expression.
pub fn account_owner(owner: Principal) -> Account {
    Account::from(owner)
}

pub fn account_with_subaccount(owner: Principal, subaccount: Subaccount) -> Account {
    Account {
        owner,
        subaccount: Some(subaccount),
    }
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum MetadataValue {
    Nat(Nat),
    Int(i64),
    Text(String),
    Blob(ByteBuf),
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct ArchiveOptions {
    pub num_blocks_to_archive: u64,
    pub max_transactions_per_response: Option<u64>,
    pub trigger_threshold: u64,
    pub max_message_size_bytes: Option<u64>,
    pub cycles_for_archive_creation: Option<u64>,
    pub node_max_memory_size_bytes: Option<u64>,
    pub controller_id: Principal,
    pub more_controller_ids: Option<Vec<Principal>>,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct FeatureFlags {
    pub icrc2: bool,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub struct InitArgs {
    pub minting_account: Account,
    pub fee_collector_account: Option<Account>,
    pub transfer_fee: Nat,
    pub decimals: Option<u8>,
    pub max_memo_length: Option<u16>,
    pub token_symbol: String,
    pub token_name: String,
    pub metadata: Vec<(String, MetadataValue)>,
    pub initial_balances: Vec<(Account, Nat)>,
    pub feature_flags: Option<FeatureFlags>,
    pub maximum_number_of_accounts: Option<u64>,
    pub accounts_overflow_trim_quantity: Option<u64>,
    pub archive_options: ArchiveOptions,
}

#[derive(CandidType, Deserialize, Clone, Debug)]
pub enum LedgerArg {
    /// Boxed only to keep the variants a similar size; candid encodes it the
    /// same either way.
    Init(Box<InitArgs>),
    Upgrade(Option<()>),
}

fn wasm_bytes() -> Vec<u8> {
    let path = env::var("ICRC1_LEDGER_WASM_FILE")
        .unwrap_or_else(|_| DEFAULT_ICRC1_LEDGER_WASM.to_string());
    read(&path).unwrap_or_else(|_| {
        panic!(
            "Could not find the ICRC-1 ledger wasm at {path}. Run the tests through \
             `./scripts/test.backend.sh`, which downloads it, or set ICRC1_LEDGER_WASM_FILE."
        )
    })
}

/// Installs a token ledger with `funded` accounts pre-credited, and returns its
/// canister id. The controller doubles as the minting account — no test needs to
/// mint, only to spend what it starts with.
pub fn deploy(pic: &PocketIc, controller: Principal, funded: &[(Principal, u64)]) -> Principal {
    let ledger = pic.create_canister();
    pic.add_cycles(ledger, LEDGER_CYCLES);

    let arg = LedgerArg::Init(Box::new(InitArgs {
        minting_account: account_owner(controller),
        fee_collector_account: None,
        transfer_fee: Nat::from(TRANSFER_FEE),
        decimals: Some(8),
        max_memo_length: Some(80),
        token_symbol: "TIPTOK".to_string(),
        token_name: "Tip test token".to_string(),
        metadata: vec![],
        initial_balances: funded
            .iter()
            .map(|(owner, amount)| (account_owner(*owner), Nat::from(*amount)))
            .collect(),
        // The reason this file exists: without ICRC-2 the ledger rejects every
        // approve, and none of the tip flows are testable.
        feature_flags: Some(FeatureFlags { icrc2: true }),
        maximum_number_of_accounts: None,
        accounts_overflow_trim_quantity: None,
        archive_options: ArchiveOptions {
            num_blocks_to_archive: 10_000,
            max_transactions_per_response: None,
            trigger_threshold: 20_000,
            max_message_size_bytes: None,
            cycles_for_archive_creation: Some(1_000_000_000_000),
            node_max_memory_size_bytes: None,
            controller_id: controller,
            more_controller_ids: None,
        },
    }));

    pic.install_canister(ledger, wasm_bytes(), encode_one(arg).unwrap(), None);
    ledger
}

fn update<T>(
    pic: &PocketIc,
    ledger: Principal,
    caller: Principal,
    method: &str,
    arg: impl CandidType,
) -> T
where
    T: for<'a> Deserialize<'a> + CandidType,
{
    let reply = pic
        .update_call(ledger, caller, method, encode_one(arg).unwrap())
        .unwrap_or_else(|err| panic!("ledger {method} rejected: {err:?}"));
    decode_one(&reply).unwrap_or_else(|err| panic!("ledger {method} decode failed: {err:?}"))
}

fn query<T>(
    pic: &PocketIc,
    ledger: Principal,
    caller: Principal,
    method: &str,
    arg: impl CandidType,
) -> T
where
    T: for<'a> Deserialize<'a> + CandidType,
{
    let reply = pic
        .query_call(ledger, caller, method, encode_one(arg).unwrap())
        .unwrap_or_else(|err| panic!("ledger {method} rejected: {err:?}"));
    decode_one(&reply).unwrap_or_else(|err| panic!("ledger {method} decode failed: {err:?}"))
}

/// Grants `spender` an allowance over `owner`'s balance. `amount` of `0` revokes.
pub fn approve(
    pic: &PocketIc,
    ledger: Principal,
    owner: Principal,
    spender: Account,
    amount: u64,
    expires_at: Option<u64>,
) -> Result<Nat, ApproveError> {
    update(
        pic,
        ledger,
        owner,
        "icrc2_approve",
        ApproveArgs {
            from_subaccount: None,
            spender,
            amount: Nat::from(amount),
            expected_allowance: None,
            expires_at,
            fee: None,
            memo: None,
            created_at_time: None,
        },
    )
}

pub fn balance_of(pic: &PocketIc, ledger: Principal, owner: Principal) -> Nat {
    query(pic, ledger, owner, "icrc1_balance_of", account_owner(owner))
}

pub fn allowance(
    pic: &PocketIc,
    ledger: Principal,
    owner: Principal,
    spender: Account,
) -> Allowance {
    query(
        pic,
        ledger,
        owner,
        "icrc2_allowance",
        AllowanceArgs {
            account: account_owner(owner),
            spender,
        },
    )
}
