use std::collections::BTreeMap;
use std::fmt;

use candid::Principal;

use crate::types::custom_token::{CustomToken, CustomTokenId, Token};
use crate::types::token::UserToken;
use crate::types::user_profile::{
    AddUserCredentialError, OisyUser, StoredUserProfile, UserCredential, UserProfile,
};
use crate::types::{CredentialType, Timestamp, TokenVersion, Version};

impl From<&Token> for CustomTokenId {
    fn from(token: &Token) -> Self {
        match token {
            Token::Icrc(token) => CustomTokenId::Icrc(token.ledger_id),
        }
    }
}

impl TokenVersion for UserToken {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn clone_with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default() + 1);
        cloned
    }

    fn clone_with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}

impl TokenVersion for CustomToken {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn clone_with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default() + 1);
        cloned
    }

    fn clone_with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}

impl fmt::Display for CredentialType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            CredentialType::ProofOfUniqueness => write!(f, "ProofOfUniqueness"),
        }
    }
}

impl TokenVersion for StoredUserProfile {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn clone_with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default() + 1);
        cloned
    }

    fn clone_with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}

impl StoredUserProfile {
    #[must_use]
    pub fn from_timestamp(now: Timestamp) -> StoredUserProfile {
        let credentials: BTreeMap<CredentialType, UserCredential> = BTreeMap::new();
        StoredUserProfile {
            credentials,
            created_timestamp: now,
            updated_timestamp: now,
            version: None,
        }
    }

    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn add_credential(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        credential_type: &CredentialType,
        issuer: String,
    ) -> Result<StoredUserProfile, AddUserCredentialError> {
        if profile_version != self.version {
            return Err(AddUserCredentialError::VersionMismatch);
        }
        let mut new_profile = self.clone_with_incremented_version();
        let user_credential = UserCredential {
            credential_type: credential_type.clone(),
            verified_date_timestamp: Some(now),
            issuer,
        };
        let mut new_credentials = new_profile.credentials.clone();
        new_credentials.insert(credential_type.clone(), user_credential);
        new_profile.credentials = new_credentials;
        new_profile.updated_timestamp = now;
        Ok(new_profile)
    }
}

impl From<&StoredUserProfile> for UserProfile {
    fn from(user: &StoredUserProfile) -> UserProfile {
        let StoredUserProfile {
            created_timestamp,
            updated_timestamp,
            version,
            credentials,
        } = user;
        UserProfile {
            created_timestamp: *created_timestamp,
            updated_timestamp: *updated_timestamp,
            version: *version,
            credentials: credentials.clone().into_values().collect(),
        }
    }
}

impl OisyUser {
    #[must_use]
    pub fn from_profile(user: &StoredUserProfile, principal: Principal) -> OisyUser {
        OisyUser {
            principal,
            pouh_verified: user
                .credentials
                .contains_key(&CredentialType::ProofOfUniqueness),
            updated_timestamp: user.updated_timestamp,
        }
    }
}
