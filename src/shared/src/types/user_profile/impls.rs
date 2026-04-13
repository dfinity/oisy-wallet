//! Methods for the `user_profile` types

use candid::Deserialize;
use serde::{de, Deserializer};

use super::UserProfile;
use crate::{
    types::agreement::{UpdateProviderAgreementsRequest, UpdateUserAgreementsRequest},
    validate::{validate_on_deserialize, Validate},
};

validate_on_deserialize!(UserProfile);
impl Validate for UserProfile {
    fn validate(&self) -> Result<(), candid::Error> {
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
