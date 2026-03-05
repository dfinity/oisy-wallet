use std::{env, fs::read, sync::Arc};

use candid::{encode_one, CandidType, Decode, Encode, Principal};
use pocket_ic::PocketIc;
use serde::{Deserialize, Serialize};
use shared::types::delegation::{
    Delegation as OisyDelegation, IIDelegationChain, SignedDelegation as OisySignedDelegation,
};

use super::pocketic::PicCanisterTrait;

const DEFAULT_II_WASM: &str = "../../internet_identity.wasm.gz";

#[derive(CandidType)]
struct IIInitArg {
    pub assigned_user_number_range: Option<(u64, u64)>,
    pub archive_config: Option<()>,
    pub canister_creation_cycles_cost: Option<u64>,
    pub register_rate_limit: Option<()>,
    pub captcha_config: Option<CaptchaConfig>,
}

#[derive(CandidType)]
struct CaptchaConfig {
    pub max_unsolved_captchas: u64,
    pub captcha_trigger: CaptchaTrigger,
}

#[derive(CandidType)]
enum CaptchaTrigger {
    Static(StaticCaptchaTrigger),
}

#[derive(CandidType)]
enum StaticCaptchaTrigger {
    CaptchaDisabled,
}

#[derive(CandidType, Deserialize)]
struct Challenge {
    pub challenge_key: String,
}

#[derive(CandidType)]
struct ChallengeResult {
    pub key: String,
    pub chars: String,
}

#[derive(CandidType)]
struct DeviceData {
    pub pubkey: Vec<u8>,
    pub alias: String,
    pub credential_id: Option<Vec<u8>>,
    pub purpose: Purpose,
    pub key_type: KeyType,
    pub protection: DeviceProtection,
    pub origin: Option<String>,
    pub metadata: Option<Vec<(String, MetadataValue)>>,
}

#[derive(CandidType, Serialize)]
enum Purpose {
    #[serde(rename = "authentication")]
    Authentication,
}

#[derive(CandidType, Serialize)]
enum KeyType {
    #[serde(rename = "unknown")]
    Unknown,
}

#[derive(CandidType, Serialize)]
enum DeviceProtection {
    #[serde(rename = "unprotected")]
    Unprotected,
}

#[derive(CandidType, Serialize)]
#[allow(dead_code)]
enum MetadataValue {
    #[serde(rename = "string")]
    String(String),
}

#[derive(CandidType, Deserialize, Debug)]
enum RegisterResponse {
    #[serde(rename = "registered")]
    Registered { user_number: u64 },
    #[serde(rename = "canister_full")]
    CanisterFull,
    #[serde(rename = "bad_challenge")]
    BadChallenge,
}

#[derive(CandidType, Deserialize, Debug)]
struct IIDelegation {
    pub pubkey: Vec<u8>,
    pub expiration: u64,
    pub targets: Option<Vec<Principal>>,
}

#[derive(CandidType, Deserialize, Debug)]
struct IISignedDelegation {
    pub delegation: IIDelegation,
    pub signature: Vec<u8>,
}

#[derive(CandidType, Deserialize, Debug)]
enum GetDelegationResponse {
    #[serde(rename = "signed_delegation")]
    SignedDelegation(IISignedDelegation),
    #[serde(rename = "no_such_delegation")]
    NoSuchDelegation,
}

pub struct IICanister {
    pub pic: Arc<PocketIc>,
    pub canister_id: Principal,
}

impl PicCanisterTrait for IICanister {
    fn pic(&self) -> Arc<PocketIc> {
        self.pic.clone()
    }

    fn canister_id(&self) -> Principal {
        self.canister_id
    }
}

impl IICanister {
    /// Installs the II WASM onto an already-created canister.
    pub fn deploy(pic: &Arc<PocketIc>, canister_id: Principal) -> Self {
        let wasm_path =
            env::var("II_CANISTER_WASM_FILE").unwrap_or_else(|_| DEFAULT_II_WASM.to_string());
        let wasm_bytes =
            read(&wasm_path).unwrap_or_else(|_| panic!("Could not find II wasm: {wasm_path}"));

        let init_arg = Some(IIInitArg {
            assigned_user_number_range: Some((10_000, 100_000)),
            archive_config: None,
            canister_creation_cycles_cost: None,
            register_rate_limit: None,
            captcha_config: Some(CaptchaConfig {
                max_unsolved_captchas: 50,
                captcha_trigger: CaptchaTrigger::Static(StaticCaptchaTrigger::CaptchaDisabled),
            }),
        });

        pic.install_canister(canister_id, wasm_bytes, encode_one(init_arg).unwrap(), None);

        IICanister {
            pic: pic.clone(),
            canister_id,
        }
    }

    /// Registers a new identity on II and returns `(user_number, device_principal)`.
    /// The `device_pubkey` should be any DER-encoded public key. The derived
    /// self-authenticating principal will be used as the caller for subsequent II calls.
    pub fn register_identity(&self, device_pubkey: &[u8]) -> (u64, Principal) {
        let caller = Principal::self_authenticating(device_pubkey);

        let challenge: Challenge = self
            .update(caller, "create_challenge", ())
            .expect("create_challenge failed");

        let challenge_result = ChallengeResult {
            key: challenge.challenge_key,
            chars: "a".to_string(),
        };

        let device = DeviceData {
            pubkey: device_pubkey.to_vec(),
            alias: "test device".to_string(),
            credential_id: None,
            purpose: Purpose::Authentication,
            key_type: KeyType::Unknown,
            protection: DeviceProtection::Unprotected,
            origin: None,
            metadata: None,
        };

        let register_arg = Encode!(&device, &challenge_result, &None::<Principal>)
            .expect("Failed to encode register args");
        let response_bytes = self
            .pic()
            .update_call(self.canister_id, caller, "register", register_arg)
            .expect("register call failed");
        let response =
            Decode!(&response_bytes, RegisterResponse).expect("Failed to decode RegisterResponse");

        match response {
            RegisterResponse::Registered { user_number } => (user_number, caller),
            other => panic!("Registration failed: {other:?}"),
        }
    }

    /// Gets a delegation from II for the given user.
    /// Returns an `IIDelegationChain` ready to pass to the backend.
    pub fn get_delegation_chain(
        &self,
        user_number: u64,
        device_principal: Principal,
        session_pubkey: &[u8],
        frontend_hostname: &str,
        targets: Option<&[Principal]>,
    ) -> IIDelegationChain {
        let prepare_arg = Encode!(
            &user_number,
            &frontend_hostname.to_string(),
            &session_pubkey.to_vec(),
            &None::<u64>
        )
        .expect("Failed to encode prepare_delegation args");

        let prepare_bytes = self
            .pic()
            .update_call(
                self.canister_id,
                device_principal,
                "prepare_delegation",
                prepare_arg,
            )
            .expect("prepare_delegation call failed");

        let (user_key, timestamp) =
            Decode!(&prepare_bytes, Vec<u8>, u64).expect("Failed to decode prepare_delegation");

        self.pic().advance_time(std::time::Duration::from_secs(1));

        let get_del_arg = Encode!(
            &user_number,
            &frontend_hostname.to_string(),
            &session_pubkey.to_vec(),
            &timestamp
        )
        .expect("Failed to encode get_delegation args");

        let get_del_bytes = self
            .pic()
            .query_call(
                self.canister_id,
                device_principal,
                "get_delegation",
                get_del_arg,
            )
            .expect("get_delegation call failed");

        let response = Decode!(&get_del_bytes, GetDelegationResponse)
            .expect("Failed to decode GetDelegationResponse");

        match response {
            GetDelegationResponse::SignedDelegation(signed) => {
                let mut delegation = OisyDelegation {
                    pubkey: signed.delegation.pubkey,
                    expiration: signed.delegation.expiration,
                    targets: signed.delegation.targets,
                };

                if let Some(t) = targets {
                    delegation.targets = Some(t.to_vec());
                }

                IIDelegationChain {
                    public_key: user_key,
                    delegations: vec![OisySignedDelegation {
                        delegation,
                        signature: signed.signature,
                    }],
                }
            }
            GetDelegationResponse::NoSuchDelegation => {
                panic!("No such delegation - prepare_delegation may have failed")
            }
        }
    }
}
