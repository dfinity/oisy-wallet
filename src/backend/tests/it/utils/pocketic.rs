//! Utilities for setting up a test environment using `PocketIC`.
pub mod pic_canister;
use std::{env, fs::read, ops::RangeBounds, sync::Arc, time::Duration};

use candid::{encode_one, CandidType, Nat, Principal};
use ic_cdk::bitcoin_canister::Network as BitcoinNetwork;
use ic_cycles_ledger_client::{InitArgs, LedgerArgs};
pub use pic_canister::PicCanisterTrait;
use pocket_ic::{CanisterSettings, PocketIc, PocketIcBuilder};
use shared::types::{
    backend_config::{Arg, InitArg},
    user_profile::{CreateUserProfileError, HasUserProfileResponse, OisyUser, UserProfile},
};

use super::mock::{CONTROLLER, FRONTEND_DERIVATION_ORIGIN, II_CANISTER_ID, SIGNER_CANISTER_ID};
use crate::utils::mock::CALLER;

const BACKEND_WASM: &str = "../../target/wasm32-unknown-unknown/release/backend.wasm";
const DEFAULT_BITCOIN_WASM: &str = "../../ic-btc-canister.wasm.gz";
const BITCOIN_CANISTER_ID: &str = "g4xu7-jiaaa-aaaan-aaaaq-cai";
const DEFAULT_CYCLES_LEDGER_WASM: &str = "../../cycles-ledger.wasm.gz";
const CYCLES_LEDGER_CANISTER_ID: &str = "um5iw-rqaaa-aaaaq-qaaba-cai";
const DEFAULT_CYCLES_LEDGER_CANISTER_ENABLED: &str = "false";

// This is necessary to deploy the bitcoin canister.
// This is a struct based on the `InitConfig` from the Bitcoin canister.
// Reference: https://github.com/dfinity/bitcoin-canister/blob/52c160168c478d5bce34b7dc5bacb78243c9d8aa/interface/src/lib.rs#L553
//
// The only field that matters is `network`. The others are considered dummy and set to `None`
// anyway.
#[derive(CandidType)]
struct BitcoinInitConfig {
    stability_threshold: Option<u64>,
    network: Option<BitcoinNetwork>,
    blocks_source: Option<String>,
    syncing: Option<String>,
    fees: Option<String>,
    api_access: Option<String>,
    disable_api_if_not_fully_synced: Option<String>,
    watchdog_canister: Option<Principal>,
    burn_cycles: Option<String>,
    lazily_evaluate_fee_percentiles: Option<String>,
}

/// Backend canister installer, using the builder pattern, for use in test environmens using
/// `PocketIC`.
///
/// # Example
/// For a default test environment:
/// ```
/// let (pic, canister_id) = BackendBuilder::default().deploy();
/// ```
/// To add a backend canister to an existing `PocketIC`:
/// ```
/// let pic = PocketIc::new();
/// let canister_id = BackendBuilder::default().deploy_to(&pic);
/// ```
/// To redeploy an existing canister:
/// ```
/// // First deployment:
/// let (pic, canister_id) = BackendBuilder::default().deploy();
/// // Subsequent deployment:
/// let canister_id = BackendBuilder::default().with_canister(canister_id).deploy_to(&pic);
/// ```
/// To customise the deployment, use the `.with_*` modifiers.  E.g.:
/// ```
/// let (pic, canister_id) = BackendBuilder::default()
///    .with_wasm("path/to/backend.wasm")
///    .with_arg(vec![1, 2, 3])
///    .with_controllers(vec![Principal::from_text("controller").unwrap()])
///    .with_cycles(1_000_000_000_000)
///    .deploy();
/// ```
#[derive(Debug)]
pub struct BackendBuilder {
    /// Canister ID of the backend canister.  If not set, a new canister will be created.
    canister_id: Option<Principal>,
    /// Cycles to add to the backend canister.
    cycles: u128,
    /// Path to the backend wasm file.
    wasm_path: String,
    /// Path to the bitcoin canister wasm file.
    bitcoin_wasm_path: String,
    /// Path to the cycles ledger canister wasm file.
    cycles_ledger_wasm_path: String,
    /// Argument to pass to the backend canister.
    arg: Vec<u8>,
    /// Controllers of the backend canister.
    controllers: Vec<Principal>,
    /// Enables the cycles ledger canister
    cycles_ledger_enabled: bool,
    /// Enables auto progress before deployment
    auto_progress_enabled: bool,
}
// Defaults
impl BackendBuilder {
    /// The default number of cycles to add to the backend canister on deployment.
    ///
    /// To override, please use `with_cycles()`.
    pub const DEFAULT_CYCLES: u128 = 2_000_000_000_000;

    /// The default Wasm file to deploy:
    /// - If the environment variable `BACKEND_WASM_PATH` is set, it will use that path.
    /// - Otherwise, it will use the `BACKEND_WASM` constant.
    ///
    /// To override, please use `with_wasm()`.
    pub fn default_wasm_path() -> String {
        env::var("BACKEND_WASM_PATH").unwrap_or_else(|_| BACKEND_WASM.to_string())
    }

    /// The default Wasm file to deploy the bitcoin canister:
    /// - If the environment variable `BITCOIN_CANISTER_WASM_FILE` is set, it will use that path.
    /// - Otherwise, it will use the `DEFAULT_BITCOIN_WASM` constant.
    ///
    /// To override, please use `with_wasm()`.
    pub fn default_bitcoin_wasm_path() -> String {
        env::var("BITCOIN_CANISTER_WASM_FILE").unwrap_or_else(|_| DEFAULT_BITCOIN_WASM.to_string())
    }

    /// The default Wasm file to deploy the cycles canister:
    /// - If the environment variable `CYCLES_LEDGER_CANISTER_WASM_FILE` is set, it will use that
    ///   path.
    /// - Otherwise, it will use the `DEFAULT_CYCLES_LEDGER_WASM` constant.
    ///
    /// To override, please use `with_wasm()`.
    pub fn default_cycles_ledger_wasm_path() -> String {
        env::var("CYCLES_LEDGER_CANISTER_WASM_FILE")
            .unwrap_or_else(|_| DEFAULT_CYCLES_LEDGER_WASM.to_string())
    }

    /// The default arguments to deploy the bitcoin canister.
    pub fn default_bitcoin_arg() -> Vec<u8> {
        let init_config = BitcoinInitConfig {
            stability_threshold: None,
            network: Some(BitcoinNetwork::Regtest),
            blocks_source: None,
            syncing: None,
            fees: None,
            api_access: None,
            disable_api_if_not_fully_synced: None,
            watchdog_canister: None,
            burn_cycles: None,
            lazily_evaluate_fee_percentiles: None,
        };
        encode_one(init_config).unwrap()
    }

    /// The default arguments to deploy the cycles ledger canister.
    pub fn default_cycles_ledger_arg() -> Vec<u8> {
        let init_config = InitArgs {
            max_blocks_per_request: 9_999u64,
            index_id: None,
        };

        encode_one(LedgerArgs::Init(init_config)).unwrap()
    }

    /// The default argument to pass to the backend canister.
    ///
    /// Please see `init_arg()` for details.
    ///
    /// To override, please use `with_arg()`.
    pub fn default_arg() -> Vec<u8> {
        encode_one(init_arg()).unwrap()
    }

    /// The default controllers of the backend canister.
    ///
    /// To override, please use `with_controllers()`.
    pub fn default_controllers() -> Vec<Principal> {
        vec![Principal::from_text(CONTROLLER)
            .expect("Test setup error: Failed to parse controller principal")]
    }

    /// The default cycles canister activation.
    ///
    /// To override, please use `with_cycles_ledger()`.
    pub fn default_cycles_ledger_enabled() -> bool {
        env::var("CYCLES_LEDGER_CANISTER_ENABLED")
            .unwrap_or_else(|_| DEFAULT_CYCLES_LEDGER_CANISTER_ENABLED.to_string())
            .parse()
            .expect("Test setup error: Failed to parse boolean defined by env variable 'CYCLES_LEDGER_CANISTER_ENABLED'")
    }

    /// The default cycles canister activation.
    ///
    /// To override, please use `with_cycles_ledger()`.
    pub fn default_auto_progress_enabled() -> bool {
        false
    }
}
impl Default for BackendBuilder {
    fn default() -> Self {
        Self {
            canister_id: None,
            cycles: Self::DEFAULT_CYCLES,
            wasm_path: Self::default_wasm_path(),
            bitcoin_wasm_path: Self::default_bitcoin_wasm_path(),
            cycles_ledger_wasm_path: Self::default_cycles_ledger_wasm_path(),
            arg: Self::default_arg(),
            controllers: Self::default_controllers(),
            cycles_ledger_enabled: Self::default_cycles_ledger_enabled(),
            auto_progress_enabled: Self::default_auto_progress_enabled(),
        }
    }
}
// Customisation
impl BackendBuilder {
    /// Sets custom controllers for the backend canister.
    #[expect(dead_code)]
    pub fn with_controllers(mut self, controllers: Vec<Principal>) -> Self {
        self.controllers = controllers;
        self
    }

    /// Configures the deployment to use a custom Wasm file.
    #[expect(dead_code)]
    pub fn with_wasm(mut self, wasm_path: &str) -> Self {
        self.wasm_path = wasm_path.to_string();
        self
    }

    /// Overrides the init argument passed to the backend canister.
    pub fn with_arg(mut self, arg: Vec<u8>) -> Self {
        self.arg = arg;
        self
    }
}
// Get parameters
impl BackendBuilder {
    /// Reads the backend Wasm bytes from the configured path.
    fn wasm_bytes(&self) -> Vec<u8> {
        read(self.wasm_path.clone())
            .unwrap_or_else(|_| panic!("Could not find the backend wasm: {}", self.wasm_path))
    }

    /// Reads the bitcoin Wasm bytes from the configured path.
    fn bitcoin_wasm_bytes(&self) -> Vec<u8> {
        read(self.bitcoin_wasm_path.clone()).unwrap_or_else(|_| {
            panic!(
                "Could not find the bitcoin wasm: {}",
                self.bitcoin_wasm_path
            )
        })
    }

    /// Reads the cycles ledger Wasm bytes from the configured path.
    fn cycles_ledger_wasm_bytes(&self) -> Vec<u8> {
        read(self.cycles_ledger_wasm_path.clone()).unwrap_or_else(|_| {
            panic!(
                "Could not find the cycles ledger wasm: {}",
                self.cycles_ledger_wasm_path
            )
        })
    }
}
// Builder
impl BackendBuilder {
    /// Get or create canister.
    fn canister_id(&mut self, pic: &PocketIc) -> Principal {
        if let Some(canister_id) = self.canister_id {
            canister_id
        } else {
            let fiduciary_subnet_id = pic
                .topology()
                .get_fiduciary()
                .expect("pic should have a fiduciary subnet.");
            let canister_id = pic.create_canister_on_subnet(None, None, fiduciary_subnet_id);
            self.canister_id = Some(canister_id);
            canister_id
        }
    }

    /// Add cycles to the backend canister.
    fn add_cycles(&mut self, pic: &PocketIc) {
        if self.cycles > 0 {
            let canister_id = self.canister_id(pic);
            pic.add_cycles(canister_id, self.cycles);
        }
    }

    /// Install the backend canister.
    fn install_backend(&mut self, pic: &PocketIc) {
        let wasm_bytes = self.wasm_bytes();
        let canister_id = self.canister_id(pic);
        let arg = self.arg.clone();
        pic.install_canister(canister_id, wasm_bytes, arg, None);
    }

    /// Install the ledger canister.
    fn install_cycles_ledger(&mut self, pic: &PocketIc) {
        let canister_id = Principal::from_text(CYCLES_LEDGER_CANISTER_ID)
            .expect("Unexpected cycles ledger canister id");
        pic.create_canister_with_id(None, None, canister_id)
            .expect("Failed creating bitcoin canister");
        let wasm_bytes = self.cycles_ledger_wasm_bytes();
        pic.install_canister(
            canister_id,
            wasm_bytes,
            Self::default_cycles_ledger_arg(),
            None,
        );
    }

    fn install_bitcoin(&mut self, pic: &PocketIc) {
        let canister_id =
            Principal::from_text(BITCOIN_CANISTER_ID).expect("Unexpected bitcoin canister id");
        pic.create_canister_with_id(None, None, canister_id)
            .expect("Failed creating bitcoin canister");
        let wasm_bytes = self.bitcoin_wasm_bytes();
        pic.install_canister(canister_id, wasm_bytes, Self::default_bitcoin_arg(), None);
    }

    /// Set controllers of the backend canister.
    fn set_controllers(&mut self, pic: &PocketIc) {
        let canister_id = self.canister_id(pic);
        pic.set_controllers(canister_id, None, self.controllers.clone())
            .expect("Test setup error: Failed to set controllers");
    }

    /// Zero the backend's freezing threshold so its frozen reserve is 0.
    ///
    /// The cycles-ledger top-up subtracts the canister's frozen reserve (derived from the freezing
    /// threshold and the idle burn rate) before sending. `PocketIC` reports a nonzero idle burn, so
    /// with the default 30-day threshold the reserve would consume the small test balance and the
    /// top-up would send nothing. Zeroing the threshold makes the reserve 0, so top-up tests behave
    /// deterministically (percentage of the full balance) regardless of `PocketIC`'s cost model.
    fn zero_freezing_threshold(&mut self, pic: &PocketIc) {
        let canister_id = self.canister_id(pic);
        let controller = self.controllers.first().copied();
        pic.update_canister_settings(
            canister_id,
            controller,
            CanisterSettings {
                freezing_threshold: Some(Nat::from(0u32)),
                ..Default::default()
            },
        )
        .expect("Test setup error: Failed to zero the freezing threshold");
    }

    pub fn deploy_backend(&mut self, pic: &PocketIc) -> Principal {
        let canister_id = self.canister_id(pic);
        self.add_cycles(pic);
        self.install_backend(pic);
        self.set_controllers(pic);
        self.zero_freezing_threshold(pic);
        canister_id
    }

    /// Setup the backend canister.
    pub fn deploy_to(&mut self, pic: &PocketIc) -> Principal {
        if self.cycles_ledger_enabled {
            self.install_cycles_ledger(pic);
        }
        self.install_bitcoin(pic);
        self.deploy_backend(pic)
    }

    /// Deploy to a new pic.
    pub fn deploy(&mut self) -> PicBackend {
        let pic = PocketIcBuilder::new()
            .with_ii_subnet()
            .with_fiduciary_subnet()
            .build();
        // Since the timestamp of the first block starts 4 years earlier, we must enable
        // auto-progress before deployment to avoid burning cycles for this entire duration.
        if self.auto_progress_enabled {
            pic.auto_progress();
        }

        let canister_id = self.deploy_to(&pic);
        PicBackend {
            pic: Arc::new(pic),
            canister_id,
        }
    }
}

impl BackendBuilder {
    /// Enables the cycles ledger canister
    pub fn with_cycles_ledger(mut self, cycle_ledger_enabled: bool) -> Self {
        self.cycles_ledger_enabled = cycle_ledger_enabled;
        self
    }

    #[expect(dead_code)]
    pub fn with_auto_progress(mut self, auto_progress_enabled: bool) -> Self {
        self.auto_progress_enabled = auto_progress_enabled;
        self
    }
}

#[inline]
pub fn controller() -> Principal {
    Principal::from_text(CONTROLLER)
        .expect("Test setup error: Failed to parse controller principal")
}

pub fn setup() -> PicBackend {
    BackendBuilder::default().deploy()
}

/// Sets up a `PocketIC` environment with NNS subnet (for root key), II subnet, and fiduciary
/// subnet. Deploys II on the II subnet and initializes the backend with the `PocketIC` root key so
/// that delegation signature verification works end-to-end.
pub fn setup_with_ii() -> (PicBackend, super::ii::IICanister) {
    let pic = PocketIcBuilder::new()
        .with_nns_subnet()
        .with_ii_subnet()
        .with_fiduciary_subnet()
        .build();

    let root_key = pic
        .root_key()
        .expect("PocketIC root key requires NNS subnet");

    let ii_subnet_id = pic
        .topology()
        .get_ii()
        .expect("II subnet not found in topology");

    let ii_canister_id = pic.create_canister_on_subnet(None, None, ii_subnet_id);

    let pic = Arc::new(pic);

    let ii = super::ii::IICanister::deploy(&pic, ii_canister_id);

    let backend_init = Arg::Init(InitArg {
        ecdsa_key_name: "test_key_1".to_string(),
        allowed_callers: vec![Principal::from_text(CALLER).unwrap()],
        ic_root_key_der: Some(root_key),
        cfs_canister_id: Some(
            Principal::from_text(SIGNER_CANISTER_ID).expect("wrong cfs canister id"),
        ),
        derivation_origin: Some(FRONTEND_DERIVATION_ORIGIN.to_string()),
        ii_canister_id: Some(ii_canister_id),
        new_user_signups_allowed: None,
    });

    let mut builder = BackendBuilder::default().with_arg(encode_one(backend_init).unwrap());

    let backend_canister_id = builder.deploy_to(&pic);
    let backend = PicBackend {
        pic: pic.clone(),
        canister_id: backend_canister_id,
    };

    (backend, ii)
}

impl PicBackend {
    #[expect(dead_code)]
    pub fn upgrade_latest_wasm(&self, encoded_arg: Option<Vec<u8>>) -> Result<(), String> {
        let backend_wasm_path =
            env::var("BACKEND_WASM_PATH").unwrap_or_else(|_| BACKEND_WASM.to_string());

        self.upgrade_with_wasm(&backend_wasm_path, encoded_arg)
    }

    pub fn upgrade_with_wasm(
        &self,
        backend_wasm_path: &String,
        encoded_arg: Option<Vec<u8>>,
    ) -> Result<(), String> {
        let wasm_bytes = read(backend_wasm_path.clone())
            .unwrap_or_else(|_| panic!("Could not find the backend wasm: {backend_wasm_path}"));

        let arg = encoded_arg.unwrap_or(encode_one(init_arg()).unwrap());

        // Upgrades burn a lot of cycles.
        // If too many cycles are burnt in a short time, the canister will be throttled, so we
        // advance time. The delay here is extremely conservative and can be reduced if
        // needed.
        self.pic.advance_time(Duration::from_secs(100_000));

        self.pic
            .upgrade_canister(
                self.canister_id,
                wasm_bytes,
                encode_one(&arg).unwrap(),
                Some(controller()),
            )
            .map_err(|e| {
                format!(
                    "Upgrade canister error code: {:?}, message: {}",
                    e.reject_code, e.reject_message
                )
            })
    }
}

pub(crate) fn init_arg() -> Arg {
    init_arg_with_ecdsa_key("test_key_1")
}

pub(crate) fn production_init_arg() -> Arg {
    init_arg_with_ecdsa_key("key_1")
}

fn init_arg_with_ecdsa_key(ecdsa_key_name: &str) -> Arg {
    Arg::Init(InitArg {
        ecdsa_key_name: ecdsa_key_name.to_string(),
        allowed_callers: vec![Principal::from_text(CALLER).unwrap()],
        ic_root_key_der: None,
        cfs_canister_id: Some(
            Principal::from_text(SIGNER_CANISTER_ID).expect("wrong cfs canister id"),
        ),
        derivation_origin: Some(FRONTEND_DERIVATION_ORIGIN.to_string()),
        ii_canister_id: Some(Principal::from_text(II_CANISTER_ID).expect("wrong ii canister id")),
        new_user_signups_allowed: None,
    })
}

pub fn setup_with_production_config() -> PicBackend {
    BackendBuilder::default()
        .with_arg(encode_one(production_init_arg()).unwrap())
        .deploy()
}

/// A test Oisy backend canister with a shared reference to the `PocketIc` instance it is installed
/// on.
pub struct PicBackend {
    pub pic: Arc<PocketIc>,
    pub canister_id: Principal,
}
impl PicCanisterTrait for PicBackend {
    fn pic(&self) -> Arc<PocketIc> {
        self.pic.clone()
    }

    fn canister_id(&self) -> Principal {
        self.canister_id
    }
}
impl PicBackend {
    /// Creates toy users with the given range of principals.
    pub fn create_users<R>(&self, range: R) -> Vec<OisyUser>
    where
        R: RangeBounds<u8> + Iterator<Item = u8>,
    {
        let mut expected_users: Vec<OisyUser> = Vec::new();
        for i in range {
            self.pic.advance_time(Duration::new(10, 0));
            let caller = Principal::self_authenticating(i.to_string());
            let response = self.update::<Result<UserProfile, CreateUserProfileError>>(
                caller,
                "create_user_profile",
                (),
            );
            let timestamp = self.pic.get_time();
            let timestamp_nanos = timestamp.as_nanos_since_unix_epoch();
            let expected_user = OisyUser {
                updated_timestamp: timestamp_nanos,
                principal: caller,
            };
            expected_users.push(expected_user);
            assert!(response.is_ok());
            assert!(response.unwrap().is_ok());
        }
        expected_users
    }

    /// Test helper that ensures the given `caller` has a user profile created.
    ///
    /// Most guarded update endpoints require the caller to already have a user
    /// profile, so tests that exercise such endpoints as an authenticated user
    /// must first call `create_user_profile`.
    ///
    /// This helper is idempotent and designed to be safe to call repeatedly:
    /// it first issues a `has_user_profile` query and only invokes the
    /// `create_user_profile` update when the profile does not yet exist. This
    /// avoids the side effects of `create_user_profile` (notably
    /// `spawn_allow_signing_if_below_limit`, which consumes per-caller
    /// rate-limit entries and spawns an inter-canister call) on repeated
    /// invocations.
    pub fn ensure_user_profile(&self, caller: Principal) {
        let exists = self
            .query::<HasUserProfileResponse>(caller, "has_user_profile", ())
            .expect("Failed to query has_user_profile")
            .has_user_profile;

        if exists {
            return;
        }

        let response = self.update::<Result<UserProfile, CreateUserProfileError>>(
            caller,
            "create_user_profile",
            (),
        );
        assert!(
            response.is_ok(),
            "Failed to create user profile for caller {caller}: {response:?}"
        );
        assert!(
            response.as_ref().unwrap().is_ok(),
            "create_user_profile rejected for caller {caller}: {response:?}"
        );
    }
}
