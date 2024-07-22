use candid::Principal;
use ic_verifiable_credentials::VcFlowSigners;
use shared::types::{user_profile::AddUserCredentialRequest, CredentialType};

use crate::Config;

pub fn get_credential_config(
    request: &AddUserCredentialRequest,
    config: &Config,
) -> Option<(VcFlowSigners, Vec<u8>, CredentialType)> {
    config
        .supported_credentials
        .as_ref()
        .and_then(|supported_credentials| {
            supported_credentials
                .iter()
                .find_map(|supported_credential| {
                    let supported_issuer_canister_id =
                        Principal::from_text(&supported_credential.issuer_canister_id).ok()?;
                    if supported_credential.credential_type.to_string()
                        == request.credential_spec.credential_type
                        && supported_issuer_canister_id == request.issuer_canister_id
                    {
                        Some((
                            VcFlowSigners {
                                ii_canister_id: Principal::from_text(
                                    &supported_credential.ii_canister_id,
                                )
                                .ok()?,
                                ii_origin: supported_credential.ii_origin.clone(),
                                issuer_canister_id: Principal::from_text(
                                    &supported_credential.issuer_canister_id,
                                )
                                .ok()?,
                                issuer_origin: supported_credential.issuer_origin.clone(),
                            },
                            config
                                .ic_root_key_raw
                                .clone()
                                .expect("Missing root key to perform validation"),
                            supported_credential.credential_type.clone(),
                        ))
                    } else {
                        None
                    }
                })
        })
}
