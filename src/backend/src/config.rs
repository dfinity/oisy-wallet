use ic_verifiable_credentials::VcFlowSigners;
use shared::types::{
    backend_config::Config, user_profile::AddUserCredentialRequest,
    verifiable_credential::CredentialType,
};

pub fn find_credential_config(
    request: &AddUserCredentialRequest,
    config: &Config,
) -> Option<(VcFlowSigners, Vec<u8>, CredentialType, String)> {
    config
        .supported_credentials
        .as_ref()
        .and_then(|supported_credentials| {
            supported_credentials
                .iter()
                .find_map(|supported_credential| {
                    if supported_credential.credential_type.to_string()
                        == request.credential_spec.credential_type
                        && supported_credential.issuer_canister_id == request.issuer_canister_id
                    {
                        Some((
                            VcFlowSigners {
                                ii_canister_id: supported_credential.ii_canister_id,
                                ii_origin: supported_credential.ii_origin.clone(),
                                issuer_canister_id: supported_credential.issuer_canister_id,
                                issuer_origin: supported_credential.issuer_origin.clone(),
                            },
                            config
                                .ic_root_key_raw
                                .clone()
                                .expect("Missing root key to perform validation"),
                            supported_credential.credential_type.clone(),
                            config.derivation_origin.clone().expect("Missing derivation origin in config. Credential can't be validated.")
                        ))
                    } else {
                        None
                    }
                })
        })
}
