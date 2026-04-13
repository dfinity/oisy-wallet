//! Methods for the `user_profile` types

use candid::Deserialize;
use serde::{de, Deserializer};

use super::{UserCredential, UserProfile, MAX_ISSUER_LENGTH};
use crate::{
    types::agreement::{UpdateProviderAgreementsRequest, UpdateUserAgreementsRequest},
    validate::{validate_on_deserialize, Validate},
};

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
        if let Some(agreements) = &self.agreements {
            agreements.validate()?;
        }
        Ok(())
    }
}

validate_on_deserialize!(UpdateUserAgreementsRequest);
impl Validate for UpdateUserAgreementsRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        if let Some(agreements) = self.agreements.clone().into() {
            agreements.validate()?;
        }
        Ok(())
    }
}

validate_on_deserialize!(UpdateProviderAgreementsRequest);
impl Validate for UpdateProviderAgreementsRequest {
    fn validate(&self) -> Result<(), candid::Error> {
        for agreement in self.provider_agreements.values() {
            agreement.validate()?;
        }
        Ok(())
    }
}
