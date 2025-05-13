//! Utilities for setting up a test environment using `PocketIC`.
pub mod pic_canister;
use std::{
    env,
    fs::read,
    ops::RangeBounds,
    sync::Arc,
    time::{Duration, UNIX_EPOCH},
};

use candid::{encode_one, CandidType, Principal};
use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork;
use ic_cycles_ledger_client::{InitArgs, LedgerArgs};
pub use pic_canister::PicCanisterTrait;
use pocket_ic::{PocketIc, PocketIcBuilder};
use shared::types::{
    backend_config::{Arg, InitArg},
    user_profile::{OisyUser, UserProfile},
    verifiable_credential::{CredentialType, SupportedCredential},
};

use super::mock::{
    CONTROLLER, II_CANISTER_ID, II_ORIGIN, ISSUER_CANISTER_ID, ISSUER_ORIGIN, SIGNER_CANISTER_ID,
    VC_DERIVATION_ORIGIN,
};
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

        encode_one(&LedgerArgs::Init(init_config)).unwrap()
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
    #[allow(dead_code)]
    pub fn with_controllers(mut self, controllers: Vec<Principal>) -> Self {
        self.controllers = controllers;
        self
    }

    /// Configures the deployment to use a custom Wasm file.
    pub fn with_wasm(mut self, wasm_path: &str) -> Self {
        self.wasm_path = wasm_path.to_string();
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
        read(self.cycles_ledger_wasm_path.clone()).expect(&format!(
            "Could not find the cycles ledger wasm: {}",
            self.cycles_ledger_wasm_path
        ))
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

    pub fn deploy_backend(&mut self, pic: &PocketIc) -> Principal {
        let canister_id = self.canister_id(pic);
        self.add_cycles(pic);
        self.install_backend(pic);
        self.set_controllers(pic);
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
    #[allow(dead_code)]
    pub fn with_cycles_ledger(mut self, cycle_ledger_enabled: bool) -> Self {
        self.cycles_ledger_enabled = cycle_ledger_enabled;
        self
    }

    #[allow(dead_code)]
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

impl PicBackend {
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
    Arg::Init(InitArg {
        ecdsa_key_name: "test_key_1".to_string(),
        allowed_callers: vec![Principal::from_text(CALLER).unwrap()],
        ic_root_key_der: None,
        supported_credentials: Some(vec![SupportedCredential {
            ii_canister_id: Principal::from_text(II_CANISTER_ID).expect("wrong ii canister id"),
            ii_origin: II_ORIGIN.to_string(),
            issuer_canister_id: Principal::from_text(ISSUER_CANISTER_ID)
                .expect("wrong issuer canister id"),
            issuer_origin: ISSUER_ORIGIN.to_string(),
            credential_type: CredentialType::ProofOfUniqueness,
        }]),
        cfs_canister_id: Some(
            Principal::from_text(SIGNER_CANISTER_ID).expect("wrong cfs canister id"),
        ),
        derivation_origin: Some(VC_DERIVATION_ORIGIN.to_string()),
    })
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
            let response = self.update::<UserProfile>(caller, "create_user_profile", ());
            let timestamp = self.pic.get_time();
            let timestamp_nanos = timestamp
                .duration_since(UNIX_EPOCH)
                .expect("Time went backwards")
                .as_nanos();
            let expected_user = OisyUser {
                updated_timestamp: timestamp_nanos as u64,
                pouh_verified: false,
                principal: caller,
            };
            expected_users.push(expected_user);
            assert!(response.is_ok());
        }
        expected_users
    }
}
