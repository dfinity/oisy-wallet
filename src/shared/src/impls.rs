use std::collections::BTreeMap;

use crate::types::custom_token::{CustomToken, CustomTokenId, Token};
use crate::types::token::UserToken;
use crate::types::user_profile::{StoredUserProfile, UserCredential, UserProfile};
use crate::types::{CredentialType, TokenVersion, Version};

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

impl StoredUserProfile {
    pub fn default(now: u64) -> StoredUserProfile {
        let credentials: BTreeMap<CredentialType, UserCredential> = BTreeMap::new();
        StoredUserProfile {
            credentials,
            created_timestamp: now,
            updated_timestamp: now,
            version: None,
        }
    }
}

impl UserProfile {
    pub fn from_stored(user: StoredUserProfile) -> UserProfile {
        let StoredUserProfile {
            created_timestamp,
            updated_timestamp,
            version,
            credentials,
        } = user;
        UserProfile {
            created_timestamp,
            updated_timestamp,
            version,
            credentials: credentials.into_values().collect(),
        }
    }
}
