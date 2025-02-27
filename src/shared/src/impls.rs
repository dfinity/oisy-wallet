use crate::types::custom_token::{
    CustomToken, CustomTokenId, IcrcToken, SplToken, SplTokenId, Token,
};
use crate::types::dapp::{AddDappSettingsError, DappCarouselSettings, DappSettings};
use crate::types::settings::Settings;
use crate::types::token::UserToken;
use crate::types::user_profile::{
    AddUserCredentialError, OisyUser, StoredUserProfile, UserCredential, UserProfile,
};
use crate::types::{
    ApiEnabled, Config, CredentialType, InitArg, Migration, MigrationProgress, MigrationReport,
    Timestamp, TokenVersion, Version,
};
use crate::validate::validate_on_deserialize;
use crate::validate::Validate;
use candid::Deserialize;
use candid::Principal;
use ic_canister_sig_creation::{extract_raw_root_pk_from_der, IC_ROOT_PK_DER};
use serde::{de, Deserializer};
use std::collections::BTreeMap;
use std::fmt;
#[cfg(test)]
use strum::IntoEnumIterator;

impl From<&Token> for CustomTokenId {
    fn from(token: &Token) -> Self {
        match token {
            Token::Icrc(token) => CustomTokenId::Icrc(token.ledger_id),
            Token::SplMainnet(SplToken { token_address, .. }) => {
                CustomTokenId::SolMainnet(token_address.clone())
            }
            Token::SplDevnet(SplToken { token_address, .. }) => {
                CustomTokenId::SolDevnet(token_address.clone())
            }
        }
    }
}

impl TokenVersion for UserToken {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn clone_with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
        cloned
    }

    fn clone_with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}

impl From<InitArg> for Config {
    /// Creates a new `Config` from the provided `InitArg`.
    ///
    /// # Panics
    /// - If the root key cannot be parsed.
    fn from(arg: InitArg) -> Self {
        let InitArg {
            ecdsa_key_name,
            allowed_callers,
            supported_credentials,
            ic_root_key_der,
            api,
            cfs_canister_id,
            derivation_origin,
        } = arg;
        let ic_root_key_raw = match extract_raw_root_pk_from_der(
            &ic_root_key_der.unwrap_or_else(|| IC_ROOT_PK_DER.to_vec()),
        ) {
            Ok(root_key) => root_key,
            Err(msg) => panic!("{}", format!("Error parsing root key: {msg}")),
        };
        Config {
            ecdsa_key_name,
            allowed_callers,
            cfs_canister_id,
            supported_credentials,
            ic_root_key_raw: Some(ic_root_key_raw),
            api,
            derivation_origin,
        }
    }
}

impl TokenVersion for CustomToken {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn clone_with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
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
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
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
        let settings = Settings {
            dapp: DappSettings {
                dapp_carousel: DappCarouselSettings {
                    hidden_dapp_ids: Vec::new(),
                },
            },
        };
        let credentials: BTreeMap<CredentialType, UserCredential> = BTreeMap::new();
        StoredUserProfile {
            settings: Some(settings),
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

    /// # Errors
    ///
    /// Will return Err if there is a version mismatch or if the dApp ID is already hidden.
    pub fn add_hidden_dapp_id(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        dapp_id: String,
    ) -> Result<StoredUserProfile, AddDappSettingsError> {
        if profile_version != self.version {
            return Err(AddDappSettingsError::VersionMismatch);
        }

        let settings = self.settings.clone().unwrap_or_default();

        if settings
            .dapp
            .dapp_carousel
            .hidden_dapp_ids
            .contains(&dapp_id)
        {
            return Ok(self.clone());
        }

        let mut new_profile = self.clone_with_incremented_version();
        let mut new_settings = new_profile.settings.clone().unwrap_or_default();
        let mut new_dapp_settings = new_settings.dapp.clone();
        let mut new_dapp_carousel_settings = new_dapp_settings.dapp_carousel.clone();
        let mut new_hidden_dapp_ids = new_dapp_carousel_settings.hidden_dapp_ids.clone();

        new_hidden_dapp_ids.push(dapp_id);
        new_dapp_carousel_settings.hidden_dapp_ids = new_hidden_dapp_ids;
        new_dapp_settings.dapp_carousel = new_dapp_carousel_settings;
        new_settings.dapp = new_dapp_settings;
        new_profile.settings = Some(new_settings);
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
            settings,
        } = user;
        UserProfile {
            created_timestamp: *created_timestamp,
            updated_timestamp: *updated_timestamp,
            version: *version,
            credentials: credentials.clone().into_values().collect(),
            settings: settings.clone(),
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

impl From<&Migration> for MigrationReport {
    fn from(migration: &Migration) -> Self {
        MigrationReport {
            to: migration.to,
            progress: migration.progress,
        }
    }
}

impl Default for ApiEnabled {
    fn default() -> Self {
        Self::Enabled
    }
}
impl ApiEnabled {
    #[must_use]
    pub fn readable(&self) -> bool {
        matches!(self, Self::Enabled | Self::ReadOnly)
    }
    #[must_use]
    pub fn writable(&self) -> bool {
        matches!(self, Self::Enabled)
    }
}
#[test]
fn test_api_enabled() {
    assert_eq!(ApiEnabled::Enabled.readable(), true);
    assert_eq!(ApiEnabled::Enabled.writable(), true);
    assert_eq!(ApiEnabled::ReadOnly.readable(), true);
    assert_eq!(ApiEnabled::ReadOnly.writable(), false);
    assert_eq!(ApiEnabled::Disabled.readable(), false);
    assert_eq!(ApiEnabled::Disabled.writable(), false);
}

impl MigrationProgress {
    /// The next phase in the migration process.
    ///
    /// Note: A given phase, such as migrating a `BTreeMap`, may need multiple steps.
    /// The code for that phase will have to keep track of those steps by means of the data in the variant.
    ///
    /// Prior art:
    /// - There is an `enum_iterator` crate, however it deals only with simple enums
    ///   without variant fields.  In this implementation, `next()` always uses the default value for
    ///   the new field, which is always None.  `next()` does NOT step through the values of the
    ///   variant field.
    /// - `strum` has the `EnumIter` derive macro, but that implements `.next()` on an iterator, not on the
    ///   enum itself, so stepping from one variant to the next is not straightforward.
    ///
    /// Note: The next state after Completed is Completed, so the the iterator will run
    /// indefinitely.  In our case returning an option and ending with None would be fine but needs
    /// additional code that we don't need.
    #[must_use]
    pub fn next(&self) -> Self {
        match self {
            MigrationProgress::Pending => MigrationProgress::LockingTarget,
            MigrationProgress::LockingTarget => MigrationProgress::CheckingTarget,
            MigrationProgress::CheckingTarget => MigrationProgress::MigratedUserTokensUpTo(None),
            MigrationProgress::MigratedUserTokensUpTo(_) => {
                MigrationProgress::MigratedCustomTokensUpTo(None)
            }
            MigrationProgress::MigratedCustomTokensUpTo(_) => {
                MigrationProgress::MigratedUserTimestampsUpTo(None)
            }
            MigrationProgress::MigratedUserTimestampsUpTo(_) => {
                MigrationProgress::MigratedUserProfilesUpTo(None)
            }
            MigrationProgress::MigratedUserProfilesUpTo(_) => {
                MigrationProgress::CheckingDataMigration
            }
            MigrationProgress::CheckingDataMigration => MigrationProgress::UnlockingTarget,
            MigrationProgress::UnlockingTarget => MigrationProgress::Unlocking,
            &MigrationProgress::Unlocking | MigrationProgress::Completed => {
                MigrationProgress::Completed
            }
            MigrationProgress::Failed(e) => MigrationProgress::Failed(*e),
        }
    }
}

// `MigrationProgress::next(&self)` should list all the elements in the enum in order, but stop at Completed.
#[test]
fn next_matches_strum_iter() {
    let mut iter = MigrationProgress::iter();
    let mut next = MigrationProgress::Pending;
    while next != MigrationProgress::Completed {
        assert_eq!(iter.next(), Some(next), "iter.next() != Some(next)");
        next = next.next();
    }
    assert_eq!(
        next,
        next.next(),
        "Once completed, it should stay completed"
    );
}

impl SplTokenId {
    pub const MAX_LENGTH: usize = 44;
    pub const MIN_LENGTH: usize = 32;
}

impl Validate for SplTokenId {
    /// Verifies that a Solana address is valid.
    ///
    /// # References
    /// - <https://solana.com/docs/more/exchange#basic-verification>
    fn validate(&self) -> Result<(), candid::Error> {
        if self.0.len() < 32 {
            return Err(candid::Error::msg(
                "Minimum valid Solana address length is 32",
            ));
        }
        if self.0.len() > 44 {
            return Err(candid::Error::msg(
                "Maximum valid Solana address length is 44",
            ));
        }
        let parsed_maybe = bs58::decode(&self.0).into_vec();
        if let Ok(bytes) = parsed_maybe {
            if bytes.len() != 32 {
                return Err(candid::Error::msg(
                    "Invalid Solana address: not 32 bytes when decoded",
                ));
            }
        } else {
            return Err(candid::Error::msg("Invalid Solana address: not base58"));
        }
        Ok(())
    }
}

impl Validate for CustomTokenId {
    fn validate(&self) -> Result<(), candid::Error> {
        match self {
            CustomTokenId::Icrc(_) => Ok(()), // This is a principal.  In principle we could check the exact type of principal.
            CustomTokenId::SolMainnet(token_address) | CustomTokenId::SolDevnet(token_address) => {
                token_address.validate()
            }
        }
    }
}

impl Validate for CustomToken {
    fn validate(&self) -> Result<(), candid::Error> {
        self.token.validate()
    }
}

impl Validate for Token {
    fn validate(&self) -> Result<(), candid::Error> {
        match self {
            Token::Icrc(token) => token.validate(),
            Token::SplMainnet(token) | Token::SplDevnet(token) => token.validate(),
        }
    }
}

impl Validate for SplToken {
    fn validate(&self) -> Result<(), candid::Error> {
        use crate::types::MAX_SYMBOL_LENGTH;
        if let Some(symbol) = &self.symbol {
            if symbol.len() > MAX_SYMBOL_LENGTH {
                return Err(candid::Error::msg("Symbol too long"));
            }
        }
        self.token_address.validate()
    }
}

impl Validate for IcrcToken {
    /// Verifies that an ICRC token is valid.
    ///
    /// - Checks that the ledger principal is the type of principal used for a canister.
    ///   - <https://wiki.internetcomputer.org/wiki/Principal>
    /// - If an index principal is present, checks that it is also the type of principal used for a canister.
    fn validate(&self) -> Result<(), candid::Error> {
        let IcrcToken {
            ledger_id,
            index_id,
        } = self;
        // The ledger_id should be appropriate for a canister.
        if ledger_id.as_slice().last() != Some(&1) {
            return Err(candid::Error::msg("Ledger ID is not a canister"));
        }
        // Likewise for the index ID, if present:
        if let Some(index_id) = index_id {
            if index_id.as_slice().last() != Some(&1) {
                return Err(candid::Error::msg("Index ID is not a canister"));
            }
        }
        Ok(())
    }
}

validate_on_deserialize!(CustomToken);
validate_on_deserialize!(CustomTokenId);
validate_on_deserialize!(IcrcToken);
validate_on_deserialize!(SplToken);
validate_on_deserialize!(SplTokenId);
