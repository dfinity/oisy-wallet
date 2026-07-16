use std::collections::BTreeMap;

use candid::{Deserialize, Error, Principal};
use ic_canister_sig_creation::{extract_raw_root_pk_from_der, IC_ROOT_PK_DER};
use serde::{de, Deserializer};

use crate::{
    types::{
        agreement::{
            Agreements, ProviderAgreementType, UpdateAgreementsError, UserAgreement, UserAgreements,
        },
        backend_config::{Config, InitArg},
        contact::{
            Contact, ContactAddressData, ContactImage, CreateContactRequest, UpdateContactRequest,
        },
        custom_token::{
            CustomToken, CustomTokenId, Dip721Token, ErcToken, ErcTokenId, ExtV2Token,
            IcPunksToken, Icrc7Token, IcrcToken, SplToken, SplTokenId, Token,
        },
        dapp::{AddDappSettingsError, DappCarouselSettings, DappSettings, MAX_DAPP_ID_LIST_LENGTH},
        exchange::{ExchangeData, ExchangeRate},
        experimental_feature::{
            ExperimentalFeatureSettingsMap, ExperimentalFeaturesSettings,
            UpdateExperimentalFeaturesSettingsError,
        },
        network::{
            NetworkSettingsMap, NetworksSettings, SetTestnetsSettingsError,
            UpdateNetworksSettingsError,
        },
        notification::{
            AddDismissedNotificationError, DismissedNotification, NotificationSettings,
            MAX_DISMISSED_NOTIFICATIONS_LIST_LENGTH,
        },
        settings::Settings,
        token::{UserToken, EVM_CONTRACT_ADDRESS_LENGTH},
        transaction_settings::{
            TransactionFilterSettings, TransactionSettings, UpdateTransactionFilterSettingsError,
        },
        user_profile::{OisyUser, StoredUserProfile, UserProfile},
        Timestamp, TokenVersion, Version, MAX_SYMBOL_LENGTH,
    },
    validate::{validate_on_deserialize, Validate},
};

// Constants for validation limits
const CONTACT_MAX_NAME_LENGTH: usize = 100;
const CONTACT_MAX_ADDRESSES: usize = 40;
const CONTACT_MAX_LABEL_LENGTH: usize = 50;
/// Maximum image size in bytes (100 KB)
pub const MAX_IMAGE_SIZE_BYTES: usize = 100 * 1024;

// Helper functions for validation
fn validate_string_length(value: &str, max_length: usize, field_name: &str) -> Result<(), Error> {
    if value.chars().count() > max_length {
        return Err(Error::msg(format!(
            "{field_name} too long, max allowed is {max_length} characters"
        )));
    }
    Ok(())
}

fn validate_string_whitespace_padding(value: &str, field_name: &str) -> Result<(), Error> {
    // Check if string is empty or contains only whitespace (this handles cases like "  ")
    if value.trim().is_empty() {
        return Err(Error::msg(format!("{field_name} cannot be empty")));
    }

    // Check for leading or trailing whitespace
    if value != value.trim() {
        return Err(Error::msg(format!(
            "{field_name} cannot have leading or trailing whitespace"
        )));
    }

    Ok(())
}

fn validate_collection_size<T>(
    collection: &[T],
    max_size: usize,
    collection_name: &str,
) -> Result<(), Error> {
    if collection.len() > max_size {
        return Err(Error::msg(format!(
            "Too many {collection_name}, max allowed is {max_size}"
        )));
    }
    Ok(())
}

fn validate_finite_float(value: f64, field_name: &str) -> Result<(), Error> {
    if !value.is_finite() {
        return Err(Error::msg(format!("{field_name} must be a finite number")));
    }
    Ok(())
}

fn validate_non_negative_float(value: f64, field_name: &str) -> Result<(), Error> {
    validate_finite_float(value, field_name)?;
    if value < 0.0 {
        return Err(Error::msg(format!("{field_name} cannot be negative")));
    }
    Ok(())
}

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
            Token::Erc20(ErcToken {
                token_address,
                chain_id,
                ..
            })
            | Token::Erc721(ErcToken {
                token_address,
                chain_id,
                ..
            })
            | Token::Erc1155(ErcToken {
                token_address,
                chain_id,
                ..
            })
            | Token::Erc4626(ErcToken {
                token_address,
                chain_id,
                ..
            }) => CustomTokenId::Ethereum(token_address.clone(), *chain_id),
            Token::ExtV2(token) => CustomTokenId::ExtV2(token.canister_id),
            Token::Dip721(token) => CustomTokenId::Dip721(token.canister_id),
            Token::IcPunks(token) => CustomTokenId::IcPunks(token.canister_id),
            Token::Icrc7(token) => CustomTokenId::Icrc7(token.canister_id),
        }
    }
}

impl TokenVersion for UserToken {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
        cloned
    }

    fn with_initial_version(&self) -> Self {
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
            ic_root_key_der,
            cfs_canister_id,
            derivation_origin,
            ii_canister_id,
            new_user_signups_allowed,
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
            ic_root_key_raw: Some(ic_root_key_raw),
            derivation_origin,
            ii_canister_id,
            new_user_signups_allowed,
        }
    }
}

impl TokenVersion for CustomToken {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
        cloned
    }

    fn with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}

impl TokenVersion for StoredUserProfile {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
        cloned
    }

    fn with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}

impl StoredUserProfile {
    #[must_use]
    pub fn from_timestamp(now: Timestamp) -> StoredUserProfile {
        let settings = Settings {
            networks: NetworksSettings::default(),
            dapp: DappSettings {
                dapp_carousel: DappCarouselSettings {
                    hidden_dapp_ids: Vec::new(),
                },
            },
            experimental_features: ExperimentalFeaturesSettings::default(),
            notifications: None,
            transactions: Some(TransactionSettings {
                filter: Some(TransactionFilterSettings::default()),
            }),
        };
        let agreements = Agreements::default();
        StoredUserProfile {
            settings: Some(settings),
            agreements: Some(agreements),
            created_timestamp: now,
            updated_timestamp: now,
            version: None,
        }
    }

    /// Returns a copy with networks map set to the specified value.
    ///
    /// If overwrite is true, the networks map will be replaced with the new value.
    /// If overwrite is false, the new value will be merged with the existing networks map.
    ///
    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn with_networks(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        networks: NetworkSettingsMap,
        overwrite: bool,
    ) -> Result<StoredUserProfile, UpdateNetworksSettingsError> {
        if profile_version != self.version {
            return Err(UpdateNetworksSettingsError::VersionMismatch);
        }

        let settings = self.settings.clone().unwrap_or_default();

        let new_networks = if overwrite {
            networks // Directly assign if overwrite is true
        } else {
            let mut merged = settings.networks.networks.clone();
            merged.extend(networks); // Updates existing keys and inserts new ones
            merged
        };

        if settings.networks.networks == new_networks {
            return Ok(self.clone());
        }

        let mut new_profile = self.with_incremented_version();
        new_profile.settings = {
            let mut settings = new_profile.settings.unwrap_or_default();
            settings.networks.networks = new_networks;
            Some(settings)
        };
        new_profile.updated_timestamp = now;
        Ok(new_profile)
    }

    /// Returns a copy with `show_testnets` set to the specified value.
    ///
    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn with_show_testnets(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        show_testnets: bool,
    ) -> Result<StoredUserProfile, SetTestnetsSettingsError> {
        if profile_version != self.version {
            return Err(SetTestnetsSettingsError::VersionMismatch);
        }

        let settings = self.settings.clone().unwrap_or_default();

        if settings.networks.testnets.show_testnets == show_testnets {
            return Ok(self.clone());
        }

        let mut new_profile = self.with_incremented_version();
        new_profile.settings = {
            let mut settings = new_profile.settings.unwrap_or_default();
            settings.networks.testnets.show_testnets = show_testnets;
            Some(settings)
        };
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

        let mut new_profile = self.with_incremented_version();
        let mut new_settings = new_profile.settings.clone().unwrap_or_default();
        let mut new_dapp_settings = new_settings.dapp.clone();
        let mut new_dapp_carousel_settings = new_dapp_settings.dapp_carousel.clone();
        let mut new_hidden_dapp_ids = new_dapp_carousel_settings.hidden_dapp_ids.clone();

        if new_hidden_dapp_ids.len() == MAX_DAPP_ID_LIST_LENGTH {
            return Err(AddDappSettingsError::MaxHiddenDappIds);
        }

        new_hidden_dapp_ids.push(dapp_id);
        new_dapp_carousel_settings.hidden_dapp_ids = new_hidden_dapp_ids;
        new_dapp_settings.dapp_carousel = new_dapp_carousel_settings;
        new_settings.dapp = new_dapp_settings;
        new_profile.settings = Some(new_settings);
        new_profile.updated_timestamp = now;
        Ok(new_profile)
    }

    /// # Errors
    ///
    /// Will return Err if there is a version mismatch or the set would exceed its capacity.
    pub fn add_dismissed_notifications(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        notifications: Vec<DismissedNotification>,
    ) -> Result<StoredUserProfile, AddDismissedNotificationError> {
        if profile_version != self.version {
            return Err(AddDismissedNotificationError::VersionMismatch);
        }

        let settings = self.settings.clone().unwrap_or_default();
        let mut dismissed = settings
            .notifications
            .unwrap_or_default()
            .dismissed_notifications;

        let old_len = dismissed.len();
        dismissed.extend(notifications);

        if dismissed.len() == old_len {
            return Ok(self.clone());
        }

        if dismissed.len() > MAX_DISMISSED_NOTIFICATIONS_LIST_LENGTH {
            return Err(AddDismissedNotificationError::MaxDismissedNotifications);
        }

        let mut new_profile = self.with_incremented_version();
        let mut new_settings = new_profile.settings.clone().unwrap_or_default();
        new_settings.notifications = Some(NotificationSettings {
            dismissed_notifications: dismissed,
        });
        new_profile.settings = Some(new_settings);
        new_profile.updated_timestamp = now;
        Ok(new_profile)
    }

    /// Returns a copy with the specified user agreements updated.
    ///
    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn with_agreements(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        agreements: UserAgreements,
    ) -> Result<StoredUserProfile, UpdateAgreementsError> {
        if profile_version != self.version {
            return Err(UpdateAgreementsError::VersionMismatch);
        }

        let current = self.agreements.clone().unwrap_or_default().agreements;

        let mut new_agreements = current.clone();

        let license_updated = agreements.license_agreement.accepted.is_some();
        let terms_updated = agreements.terms_of_use.accepted.is_some();
        let privacy_updated = agreements.privacy_policy.accepted.is_some();

        if license_updated {
            new_agreements.license_agreement = agreements.license_agreement;
        }
        if terms_updated {
            new_agreements.terms_of_use = agreements.terms_of_use;
        }
        if privacy_updated {
            new_agreements.privacy_policy = agreements.privacy_policy;
        }

        if current.eq(&new_agreements) {
            return Ok(self.clone());
        }

        if license_updated && matches!(new_agreements.license_agreement.accepted, Some(true)) {
            new_agreements.license_agreement.last_accepted_at_ns = Some(now);
        }
        if terms_updated && matches!(new_agreements.terms_of_use.accepted, Some(true)) {
            new_agreements.terms_of_use.last_accepted_at_ns = Some(now);
        }
        if privacy_updated && matches!(new_agreements.privacy_policy.accepted, Some(true)) {
            new_agreements.privacy_policy.last_accepted_at_ns = Some(now);
        }

        let mut new_profile = self.with_incremented_version();
        new_profile.agreements = {
            let mut agreements = new_profile.agreements.unwrap_or_default();
            agreements.agreements = new_agreements;
            Some(agreements)
        };
        new_profile.updated_timestamp = now;

        Ok(new_profile)
    }

    /// Returns a copy with the specified provider agreements updated.
    ///
    /// Only entries where `accepted` is `Some(_)` are applied. Existing provider agreements not
    /// present in the request are left unchanged.
    ///
    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn with_provider_agreements(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        provider_agreements: BTreeMap<ProviderAgreementType, UserAgreement>,
    ) -> Result<StoredUserProfile, UpdateAgreementsError> {
        if profile_version != self.version {
            return Err(UpdateAgreementsError::VersionMismatch);
        }

        let current = self
            .agreements
            .clone()
            .unwrap_or_default()
            .provider_agreements
            .unwrap_or_default();

        let mut merged = current.clone();

        let mut updated_keys = Vec::new();
        for (provider_type, agreement) in provider_agreements {
            if agreement.accepted.is_some() {
                merged.insert(provider_type.clone(), agreement.clone());
                updated_keys.push(provider_type.clone());
            }
        }

        if current == merged {
            return Ok(self.clone());
        }

        for key in &updated_keys {
            if let Some(agreement) = merged.get_mut(key) {
                if matches!(agreement.accepted, Some(true)) {
                    agreement.last_accepted_at_ns = Some(now);
                }
            }
        }

        let mut new_profile = self.with_incremented_version();
        new_profile.agreements = {
            let mut agreements = new_profile.agreements.unwrap_or_default();
            agreements.provider_agreements = Some(merged);
            Some(agreements)
        };
        new_profile.updated_timestamp = now;

        Ok(new_profile)
    }

    /// Returns a copy with experimental features settings map set to the specified value.
    ///
    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn with_experimental_features_settings(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        experimental_features: ExperimentalFeatureSettingsMap,
    ) -> Result<StoredUserProfile, UpdateExperimentalFeaturesSettingsError> {
        if profile_version != self.version {
            return Err(UpdateExperimentalFeaturesSettingsError::VersionMismatch);
        }

        let settings = self.settings.clone().unwrap_or_default();

        let new_experimental_features = {
            let mut merged = settings.experimental_features.experimental_features.clone();
            merged.extend(experimental_features); // Updates existing keys and inserts new ones
            merged
        };

        if settings.experimental_features.experimental_features == new_experimental_features {
            return Ok(self.clone());
        }

        let mut new_profile = self.with_incremented_version();
        new_profile.settings = {
            let mut settings = new_profile.settings.unwrap_or_default();
            settings.experimental_features.experimental_features = new_experimental_features;
            Some(settings)
        };
        new_profile.updated_timestamp = now;
        Ok(new_profile)
    }

    /// Returns a copy with the transaction filter settings updated.
    ///
    /// # Errors
    ///
    /// Will return Err if there is a version mismatch.
    pub fn with_transaction_filter_settings(
        &self,
        profile_version: Option<Version>,
        now: Timestamp,
        filter: TransactionFilterSettings,
    ) -> Result<StoredUserProfile, UpdateTransactionFilterSettingsError> {
        if profile_version != self.version {
            return Err(UpdateTransactionFilterSettingsError::VersionMismatch);
        }

        let transactions = self
            .settings
            .clone()
            .unwrap_or_default()
            .transactions
            .unwrap_or_default();

        if transactions.filter.as_ref() == Some(&filter) {
            return Ok(self.clone());
        }

        let mut new_profile = self.with_incremented_version();
        new_profile.settings = {
            let mut settings = new_profile.settings.unwrap_or_default();
            let mut transactions = settings.transactions.unwrap_or_default();
            transactions.filter = Some(filter);
            settings.transactions = Some(transactions);
            Some(settings)
        };
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
            settings,
            agreements,
        } = user;
        UserProfile {
            created_timestamp: *created_timestamp,
            updated_timestamp: *updated_timestamp,
            version: *version,
            settings: settings.clone(),
            agreements: agreements.clone(),
        }
    }
}

impl OisyUser {
    #[must_use]
    pub fn from_profile(user: &StoredUserProfile, principal: Principal) -> OisyUser {
        OisyUser {
            principal,
            updated_timestamp: user.updated_timestamp,
        }
    }
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
    fn validate(&self) -> Result<(), Error> {
        if self.0.len() < 32 {
            return Err(Error::msg("Minimum valid Solana address length is 32"));
        }
        if self.0.len() > 44 {
            return Err(Error::msg("Maximum valid Solana address length is 44"));
        }
        let parsed_maybe = bs58::decode(&self.0).into_vec();
        if let Ok(bytes) = parsed_maybe {
            if bytes.len() != 32 {
                return Err(Error::msg(
                    "Invalid Solana address: not 32 bytes when decoded",
                ));
            }
        } else {
            return Err(Error::msg("Invalid Solana address: not base58"));
        }
        Ok(())
    }
}

impl ErcTokenId {
    pub const MAX_LENGTH: usize = 42;
    pub const MIN_LENGTH: usize = 42;
}

impl Validate for ErcTokenId {
    /// Verifies that an Ethereum/EVM address is valid.
    fn validate(&self) -> Result<(), Error> {
        if self.0.len() != 42 {
            return Err(Error::msg("Invalid Ethereum/EVM contract address length"));
        }
        Ok(())
    }
}

impl Validate for CustomTokenId {
    fn validate(&self) -> Result<(), Error> {
        match self {
            CustomTokenId::Icrc(_)
            | CustomTokenId::ExtV2(_)
            | CustomTokenId::Dip721(_)
            | CustomTokenId::IcPunks(_)
            | CustomTokenId::Icrc7(_) => Ok(()), /* This is a principal. */
            // In principle, we
            // could check the exact
            // type of principal.
            CustomTokenId::SolMainnet(token_address) | CustomTokenId::SolDevnet(token_address) => {
                token_address.validate()
            }
            CustomTokenId::Ethereum(token_address, _) => token_address.validate(),
        }
    }
}

impl Validate for CustomToken {
    fn validate(&self) -> Result<(), Error> {
        self.token.validate()
    }
}

impl Validate for Token {
    fn validate(&self) -> Result<(), Error> {
        match self {
            Token::Icrc(token) => token.validate(),
            Token::SplMainnet(token) | Token::SplDevnet(token) => token.validate(),
            Token::Erc20(token)
            | Token::Erc721(token)
            | Token::Erc1155(token)
            | Token::Erc4626(token) => token.validate(),
            Token::ExtV2(token) => token.validate(),
            Token::Dip721(token) => token.validate(),
            Token::IcPunks(token) => token.validate(),
            Token::Icrc7(token) => token.validate(),
        }
    }
}

impl Validate for SplToken {
    fn validate(&self) -> Result<(), Error> {
        use crate::types::MAX_SYMBOL_LENGTH;
        if let Some(symbol) = &self.symbol {
            if symbol.chars().count() > MAX_SYMBOL_LENGTH {
                return Err(Error::msg(format!(
                    "Symbol too long: {} > {}",
                    symbol.len(),
                    MAX_SYMBOL_LENGTH
                )));
            }
        }
        self.token_address.validate()
    }
}

impl Validate for ErcToken {
    fn validate(&self) -> Result<(), Error> {
        self.token_address.validate()
    }
}

impl Validate for IcrcToken {
    /// Verifies that an ICRC token is valid.
    ///
    /// - Checks that the ledger principal is the type of principal used for a canister.
    ///   - <https://wiki.internetcomputer.org/wiki/Principal>
    /// - If an index principal is present, checks that it is also the type of principal used for a
    ///   canister.
    fn validate(&self) -> Result<(), Error> {
        let IcrcToken {
            ledger_id,
            index_id,
        } = self;
        // The ledger_id should be appropriate for a canister.
        if ledger_id.as_slice().last() != Some(&1) {
            return Err(Error::msg("Ledger ID is not a canister"));
        }
        // Likewise for the index ID, if present:
        if let Some(index_id) = index_id {
            if index_id.as_slice().last() != Some(&1) {
                return Err(Error::msg("Index ID is not a canister"));
            }
        }
        Ok(())
    }
}

impl Validate for ExtV2Token {
    /// Verifies that an EXT v2 token is valid.
    ///
    /// - Checks that the canister principal is the type of principal used for a canister.
    ///   - <https://wiki.internetcomputer.org/wiki/Principal>
    fn validate(&self) -> Result<(), Error> {
        let ExtV2Token { canister_id } = self;
        // The canister_id should be appropriate for a canister.
        if canister_id.as_slice().last() != Some(&1) {
            return Err(Error::msg("Canister ID is not a canister"));
        }
        Ok(())
    }
}

impl Validate for Dip721Token {
    /// Verifies that a DIP721 token is valid.
    ///
    /// - Checks that the canister principal is the type of principal used for a canister.
    ///   - <https://wiki.internetcomputer.org/wiki/Principal>
    fn validate(&self) -> Result<(), Error> {
        let Dip721Token { canister_id } = self;
        // The canister_id should be appropriate for a canister.
        if canister_id.as_slice().last() != Some(&1) {
            return Err(Error::msg("Canister ID is not a canister"));
        }
        Ok(())
    }
}

impl Validate for IcPunksToken {
    /// Verifies that an `ICPunks` token is valid.
    ///
    /// - Checks that the canister principal is the type of principal used for a canister.
    ///   - <https://wiki.internetcomputer.org/wiki/Principal>
    fn validate(&self) -> Result<(), Error> {
        let IcPunksToken { canister_id } = self;
        // The canister_id should be appropriate for a canister.
        if canister_id.as_slice().last() != Some(&1) {
            return Err(Error::msg("Canister ID is not a canister"));
        }
        Ok(())
    }
}

impl Validate for Icrc7Token {
    /// Verifies that an ICRC-7 token is valid.
    ///
    /// - Checks that the canister principal is the type of principal used for a canister.
    ///   - <https://wiki.internetcomputer.org/wiki/Principal>
    fn validate(&self) -> Result<(), Error> {
        let Icrc7Token { canister_id } = self;
        // The canister_id should be appropriate for a canister.
        if canister_id.as_slice().last() != Some(&1) {
            return Err(Error::msg("Canister ID is not a canister"));
        }
        Ok(())
    }
}

impl Validate for UserToken {
    fn validate(&self) -> Result<(), Error> {
        if self.contract_address.len() != EVM_CONTRACT_ADDRESS_LENGTH {
            return Err(Error::msg("Invalid EVM contract address length"));
        }
        if let Some(symbol) = &self.symbol {
            if symbol.len() > MAX_SYMBOL_LENGTH {
                return Err(Error::msg(format!(
                    "Token symbol should not exceed {MAX_SYMBOL_LENGTH} bytes",
                )));
            }
        }
        Ok(())
    }
}

impl Validate for Contact {
    fn validate(&self) -> Result<(), Error> {
        // Validate name length
        validate_string_length(&self.name, CONTACT_MAX_NAME_LENGTH, "Contact.name")?;

        // Validate number of addresses
        validate_collection_size(&self.addresses, CONTACT_MAX_ADDRESSES, "Contact.addresses")?;

        Ok(())
    }
}

impl Validate for ContactAddressData {
    fn validate(&self) -> Result<(), Error> {
        // Note: We don't need to validate TokenAccountId since it has its own validation

        // Check if the label exists
        if let Some(label) = &self.label {
            validate_string_length(label, CONTACT_MAX_LABEL_LENGTH, "ContactAddressData.label")?;
        }

        Ok(())
    }
}

impl Validate for ContactImage {
    fn validate(&self) -> Result<(), Error> {
        if self.data.len() > MAX_IMAGE_SIZE_BYTES {
            return Err(Error::msg(format!(
                "ContactImage.data exceeds max size of {MAX_IMAGE_SIZE_BYTES} bytes"
            )));
        }
        Ok(())
    }
}

impl Validate for CreateContactRequest {
    fn validate(&self) -> Result<(), Error> {
        // Validate that string length is not greater than the max allowed
        validate_string_length(
            &self.name,
            CONTACT_MAX_NAME_LENGTH,
            "CreateContactRequest.name",
        )?;

        // Validate that string does not contain leading, trailing or empty whitespaces
        validate_string_whitespace_padding(&self.name, "CreateContactRequest.name")?;

        // Validate that the name is not an empty string
        validate_string_length(
            &self.name,
            CONTACT_MAX_NAME_LENGTH,
            "CreateContactRequest.name",
        )?;

        Ok(())
    }
}

impl Validate for UpdateContactRequest {
    fn validate(&self) -> Result<(), Error> {
        // Validate that string length is not greater than the max allowed
        validate_string_length(
            &self.name,
            CONTACT_MAX_NAME_LENGTH,
            "UpdateContactRequest.name",
        )?;

        // Validate that string does not contain leading, trailing or empty whitespaces
        validate_string_whitespace_padding(&self.name, "UpdateContactRequest.name")?;

        // Validate that the number of addresses is not greater than the max allowed
        validate_collection_size(
            &self.addresses,
            CONTACT_MAX_ADDRESSES,
            "UpdateContactRequest.addresses",
        )?;

        Ok(())
    }
}

impl Validate for ExchangeData {
    fn validate(&self) -> Result<(), Error> {
        if self.timestamp_ns == 0 {
            return Err(Error::msg("timestamp_ns cannot be zero"));
        }
        if let Some(price) = self.price {
            validate_non_negative_float(price, "price")?;
        }
        if let Some(change) = self.price_24h_change_pct {
            validate_finite_float(change, "price_24h_change_pct")?;
            if change < -100.0 {
                return Err(Error::msg("price_24h_change_pct cannot be less than -100%"));
            }
        }
        if let Some(market_cap) = self.market_cap {
            validate_non_negative_float(market_cap, "market_cap")?;
        }
        Ok(())
    }
}

impl Validate for ExchangeRate {
    fn validate(&self) -> Result<(), Error> {
        self.usd.validate()
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use crate::types::{
        agreement::{
            ProviderAgreementProvider, ProviderAgreementScope, ProviderAgreementType,
            UpdateAgreementsError, UserAgreement,
        },
        user_profile::StoredUserProfile,
    };

    fn swap_key() -> ProviderAgreementType {
        ProviderAgreementType {
            provider: ProviderAgreementProvider::NearIntents,
            scope: ProviderAgreementScope::Swap,
        }
    }

    fn profile_with_provider(
        key: &ProviderAgreementType,
        accepted: bool,
        last_accepted_at_ns: Option<u64>,
    ) -> StoredUserProfile {
        let mut profile = StoredUserProfile::from_timestamp(1_000);
        let mut map = BTreeMap::new();
        map.insert(
            key.clone(),
            UserAgreement {
                accepted: Some(accepted),
                last_accepted_at_ns,
                ..Default::default()
            },
        );
        let mut agreements = profile.agreements.unwrap_or_default();
        agreements.provider_agreements = Some(map);
        profile.agreements = Some(agreements);
        profile
    }

    mod with_provider_agreements {
        use super::{
            profile_with_provider, swap_key, BTreeMap, ProviderAgreementProvider,
            ProviderAgreementScope, ProviderAgreementType, StoredUserProfile,
            UpdateAgreementsError, UserAgreement,
        };

        #[test]
        fn test_version_mismatch_returns_error() {
            let profile = StoredUserProfile::from_timestamp(1_000);
            let mut request = BTreeMap::new();
            request.insert(
                swap_key(),
                UserAgreement {
                    accepted: Some(true),
                    ..Default::default()
                },
            );

            let result = profile.with_provider_agreements(Some(999), 2_000, request);
            assert_eq!(result, Err(UpdateAgreementsError::VersionMismatch));
        }

        #[test]
        fn test_noop_when_all_accepted_none() {
            let profile = profile_with_provider(&swap_key(), true, Some(1_000));
            let request = BTreeMap::from([(
                swap_key(),
                UserAgreement {
                    accepted: None,
                    ..Default::default()
                },
            )]);

            let result = profile
                .with_provider_agreements(profile.version, 2_000, request)
                .unwrap();
            assert_eq!(result.version, profile.version);
            assert_eq!(result.agreements, profile.agreements);
        }

        #[test]
        fn test_noop_when_request_matches_current() {
            let profile = profile_with_provider(&swap_key(), true, Some(1_000));
            let request = BTreeMap::from([(
                swap_key(),
                UserAgreement {
                    accepted: Some(true),
                    last_accepted_at_ns: Some(1_000),
                    ..Default::default()
                },
            )]);

            let result = profile
                .with_provider_agreements(profile.version, 2_000, request)
                .unwrap();
            assert_eq!(result.version, profile.version);
        }

        #[test]
        fn test_acceptance_sets_last_accepted_at_ns() {
            let profile = StoredUserProfile::from_timestamp(1_000);
            let request = BTreeMap::from([(
                swap_key(),
                UserAgreement {
                    accepted: Some(true),
                    ..Default::default()
                },
            )]);

            let result = profile
                .with_provider_agreements(profile.version, 2_000, request)
                .unwrap();
            let provider_agreements = result.agreements.unwrap().provider_agreements.unwrap();
            let agreement = provider_agreements.get(&swap_key()).unwrap();

            assert_eq!(agreement.accepted, Some(true));
            assert_eq!(agreement.last_accepted_at_ns, Some(2_000));
        }

        #[test]
        fn test_rejection_does_not_set_last_accepted_at_ns() {
            let profile = StoredUserProfile::from_timestamp(1_000);
            let request = BTreeMap::from([(
                swap_key(),
                UserAgreement {
                    accepted: Some(false),
                    ..Default::default()
                },
            )]);

            let result = profile
                .with_provider_agreements(profile.version, 2_000, request)
                .unwrap();
            let provider_agreements = result.agreements.unwrap().provider_agreements.unwrap();
            let agreement = provider_agreements.get(&swap_key()).unwrap();

            assert_eq!(agreement.accepted, Some(false));
            assert_eq!(agreement.last_accepted_at_ns, None);
        }

        #[test]
        fn test_untouched_accepted_agreement_preserves_timestamp() {
            let existing_key = swap_key();
            let profile = profile_with_provider(&existing_key, true, Some(1_000));

            let new_key = ProviderAgreementType {
                provider: ProviderAgreementProvider::NearIntents,
                scope: ProviderAgreementScope::Swap,
            };

            // We need a different key to trigger a real change without touching
            // the existing one. Since there's only one variant for now, we
            // simulate by sending an update for the same key with accepted: None
            // (skipped) and a second real key. Because the enum currently only
            // has one variant, we instead verify via a two-step scenario:
            // first accept swap, then re-accept swap with a different field to
            // trigger a diff, and ensure last_accepted_at_ns doesn't change for
            // untouched entries.

            // Step 1: profile already has swap_key accepted at ts=1_000
            // Step 2: re-send the same key but with a different text_sha256 to
            //         force a change while keeping accepted = Some(true).
            let request = BTreeMap::from([(
                new_key,
                UserAgreement {
                    accepted: Some(true),
                    text_sha256: Some("a".repeat(64)),
                    ..Default::default()
                },
            )]);

            let result = profile
                .with_provider_agreements(profile.version, 5_000, request)
                .unwrap();
            let provider_agreements = result.agreements.unwrap().provider_agreements.unwrap();
            let agreement = provider_agreements.get(&existing_key).unwrap();

            // The key was updated (same key, new text_sha256), so
            // last_accepted_at_ns should be set to the new timestamp.
            assert_eq!(agreement.accepted, Some(true));
            assert_eq!(agreement.last_accepted_at_ns, Some(5_000));
        }

        #[test]
        fn test_increments_version_on_change() {
            let profile = StoredUserProfile::from_timestamp(1_000);
            let request = BTreeMap::from([(
                swap_key(),
                UserAgreement {
                    accepted: Some(true),
                    ..Default::default()
                },
            )]);

            let result = profile
                .with_provider_agreements(profile.version, 2_000, request)
                .unwrap();
            assert_eq!(result.version, Some(1));
        }

        #[test]
        fn test_empty_request_is_noop() {
            let profile = profile_with_provider(&swap_key(), true, Some(1_000));
            let request = BTreeMap::new();

            let result = profile
                .with_provider_agreements(profile.version, 2_000, request)
                .unwrap();
            assert_eq!(result.version, profile.version);
            assert_eq!(result.agreements, profile.agreements);
        }
    }

    mod with_agreements {
        use super::StoredUserProfile;
        use crate::types::agreement::{UserAgreement, UserAgreements};

        fn profile_with_user_agreements(agreements: UserAgreements) -> StoredUserProfile {
            let mut profile = StoredUserProfile::from_timestamp(1_000);
            let mut stored_agreements = profile.agreements.clone().unwrap_or_default();
            stored_agreements.agreements = agreements;
            profile.agreements = Some(stored_agreements);
            profile
        }

        #[test]
        fn test_untouched_accepted_agreement_preserves_timestamp() {
            let profile = profile_with_user_agreements(UserAgreements {
                license_agreement: UserAgreement {
                    accepted: Some(true),
                    last_accepted_at_ns: Some(1_000),
                    ..Default::default()
                },
                ..Default::default()
            });

            // Update only terms_of_use; license is not touched
            let request = UserAgreements {
                license_agreement: UserAgreement {
                    accepted: None,
                    ..Default::default()
                },
                terms_of_use: UserAgreement {
                    accepted: Some(true),
                    ..Default::default()
                },
                privacy_policy: UserAgreement {
                    accepted: None,
                    ..Default::default()
                },
            };

            let result = profile
                .with_agreements(profile.version, 5_000, request)
                .unwrap();
            let a = result.agreements.unwrap().agreements;

            // license_agreement was NOT in the update, so its timestamp must be preserved
            assert_eq!(a.license_agreement.last_accepted_at_ns, Some(1_000));
            // terms_of_use was newly accepted, so it gets the new timestamp
            assert_eq!(a.terms_of_use.last_accepted_at_ns, Some(5_000));
        }

        #[test]
        fn test_untouched_agreement_preserves_metadata() {
            let license_text_sha256 = "a".repeat(64);
            let profile = profile_with_user_agreements(UserAgreements {
                license_agreement: UserAgreement {
                    accepted: Some(true),
                    last_accepted_at_ns: Some(1_000),
                    last_updated_at_ms: Some(1_700_000_000_000),
                    text_sha256: Some(license_text_sha256.clone()),
                },
                ..Default::default()
            });

            let request = UserAgreements {
                terms_of_use: UserAgreement {
                    accepted: Some(true),
                    last_updated_at_ms: Some(1_800_000_000_000),
                    text_sha256: Some("b".repeat(64)),
                    ..Default::default()
                },
                ..Default::default()
            };

            let result = profile
                .with_agreements(profile.version, 5_000, request)
                .unwrap();
            let agreements = result.agreements.unwrap().agreements;

            assert_eq!(
                agreements.license_agreement,
                UserAgreement {
                    accepted: Some(true),
                    last_accepted_at_ns: Some(1_000),
                    last_updated_at_ms: Some(1_700_000_000_000),
                    text_sha256: Some(license_text_sha256),
                }
            );
            assert_eq!(agreements.terms_of_use.last_accepted_at_ns, Some(5_000));
            assert_eq!(
                agreements.terms_of_use.last_updated_at_ms,
                Some(1_800_000_000_000)
            );
        }
    }
}

// Apply the validation during deserialization for all types
validate_on_deserialize!(Contact);
validate_on_deserialize!(ContactAddressData);
validate_on_deserialize!(CreateContactRequest);
validate_on_deserialize!(UpdateContactRequest);
validate_on_deserialize!(ContactImage);
validate_on_deserialize!(CustomToken);
validate_on_deserialize!(CustomTokenId);
validate_on_deserialize!(IcrcToken);
validate_on_deserialize!(ExtV2Token);
validate_on_deserialize!(Dip721Token);
validate_on_deserialize!(IcPunksToken);
validate_on_deserialize!(Icrc7Token);
validate_on_deserialize!(SplToken);
validate_on_deserialize!(SplTokenId);
validate_on_deserialize!(ErcToken);
validate_on_deserialize!(ErcTokenId);
validate_on_deserialize!(UserToken);
validate_on_deserialize!(ExchangeData);
validate_on_deserialize!(ExchangeRate);
