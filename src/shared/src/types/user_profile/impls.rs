//! Methods for the `user_profile` types

use std::collections::HashMap;

use candid::Deserialize;
use serde::{de, Deserializer};

use super::{AddUserCredentialRequest, UserCredential, UserProfile, MAX_ISSUER_LENGTH};
use crate::validate::{validate_on_deserialize, Validate};

fn validate_issuer(issuer: &str) -> Result<(), candid::Error> {
    if issuer.len() > MAX_ISSUER_LENGTH {
        return Err(candid::Error::msg(format!(
            "Issuer is too long: {}",
            issuer.len()
        )));
    }
    Ok(())
}

validate_on_deserialize!(UserCredential);
impl Validate for UserCredential {
    fn validate(&self) -> Result<(), candid::Error> {
        validate_issuer(&self.issuer)
    }
}

validate_on_deserialize!(UserProfile);
impl Validate for UserProfile {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.credentials.len() > UserProfile::MAX_CREDENTIALS {
            return Err(candid::Error::msg(format!(
                "Too many credentials: {} > {}",
                self.credentials.len(),
                UserProfile::MAX_CREDENTIALS
            )));
        }
        Ok(())
    }
}

validate_on_deserialize!(AddUserCredentialRequest);
impl Validate for AddUserCredentialRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.credential_jwt.len() > AddUserCredentialRequest::MAX_CREDENTIAL_JWT_LENGTH {
            return Err(candid::Error::msg(format!(
                "Credential JWT is too long: {} > {}",
                self.credential_jwt.len(),
                AddUserCredentialRequest::MAX_CREDENTIAL_JWT_LENGTH
            )));
        }
        if self.credential_spec.credential_type.len()
            > AddUserCredentialRequest::MAX_CREDENTIAL_TYPE_LENGTH
        {
            return Err(candid::Error::msg(format!(
                "Credential type is too long: {} > {}",
                self.credential_spec.credential_type.len(),
                AddUserCredentialRequest::MAX_CREDENTIAL_TYPE_LENGTH
            )));
        }
        if let Some(args) = &self.credential_spec.arguments {
            let credential_spec_args_len = args.len();
            if credential_spec_args_len > AddUserCredentialRequest::MAX_CREDENTIAL_SPEC_ARGUMENTS {
                return Err(candid::Error::msg(format!(
                    "Too many arguments: {credential_spec_args_len} > {}",
                    AddUserCredentialRequest::MAX_CREDENTIAL_SPEC_ARGUMENTS,
                )));
            }
        }
        Ok(())
    }
}
