use std::{collections::BTreeMap, fmt};

use candid::{Deserialize, Error, Principal};
use ic_canister_sig_creation::{extract_raw_root_pk_from_der, IC_ROOT_PK_DER};
use serde::{de, Deserializer};

use crate::{
    types::{
        backend_config::{Config, InitArg},
        contact::{
            Contact, ContactAddressData, ContactImage, CreateContactRequest, UpdateContactRequest,
        },
        custom_token::{
            CustomToken, CustomTokenId, ErcToken, ErcTokenId, IcrcToken, SplToken, SplTokenId,
            Token,
        },
        dapp::{AddDappSettingsError, DappCarouselSettings, DappSettings, MAX_DAPP_ID_LIST_LENGTH},
        network::{
            NetworkSettingsMap, NetworksSettings, SaveNetworksSettingsError,
            SaveTestnetsSettingsError,
        },
        settings::Settings,
        token::{UserToken, EVM_CONTRACT_ADDRESS_LENGTH},
        user_profile::{
            AddUserCredentialError, OisyUser, StoredUserProfile, UserCredential, UserProfile,
        },
        verifiable_credential::CredentialType,
        Timestamp, TokenVersion, Version, MAX_SYMBOL_LENGTH,
    },
    validate::{validate_on_deserialize, Validate},
};
use crate::types::agreement::Agreements;

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
            }) => CustomTokenId::Ethereum(token_address.clone(), *chain_id),
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
            supported_credentials,
            ic_root_key_der,
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
            derivation_origin,
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
        };
        let agreements = Agreements::default();
        let credentials: BTreeMap<CredentialType, UserCredential> = BTreeMap::new();
        StoredUserProfile {
            settings: Some(settings),
            agreements: Some(agreements),
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
        let mut new_profile = self.with_incremented_version();
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
    ) -> Result<StoredUserProfile, SaveNetworksSettingsError> {
        if profile_version != self.version {
            return Err(SaveNetworksSettingsError::VersionMismatch);
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
    ) -> Result<StoredUserProfile, SaveTestnetsSettingsError> {
        if profile_version != self.version {
            return Err(SaveTestnetsSettingsError::VersionMismatch);
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
}

impl From<&StoredUserProfile> for UserProfile {
    fn from(user: &StoredUserProfile) -> UserProfile {
        let StoredUserProfile {
            created_timestamp,
            updated_timestamp,
            version,
            credentials,
            settings,
            agreements,
        } = user;
        UserProfile {
            created_timestamp: *created_timestamp,
            updated_timestamp: *updated_timestamp,
            version: *version,
            credentials: credentials.clone().into_values().collect(),
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
            pouh_verified: user
                .credentials
                .contains_key(&CredentialType::ProofOfUniqueness),
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

impl ErcTokenId {
    pub const MAX_LENGTH: usize = 42;
    pub const MIN_LENGTH: usize = 42;
}

impl Validate for ErcTokenId {
    /// Verifies that an Ethereum/EVM address is valid.
    fn validate(&self) -> Result<(), candid::Error> {
        if self.0.len() != 42 {
            return Err(candid::Error::msg(
                "Invalid Ethereum/EVM contract address length",
            ));
        }
        Ok(())
    }
}

impl Validate for CustomTokenId {
    fn validate(&self) -> Result<(), candid::Error> {
        match self {
            CustomTokenId::Icrc(_) => Ok(()), /* This is a principal.  In principle, we could */
            // check the exact type of principal.
            CustomTokenId::SolMainnet(token_address) | CustomTokenId::SolDevnet(token_address) => {
                token_address.validate()
            }
            CustomTokenId::Ethereum(token_address, _) => token_address.validate(),
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
            Token::Erc20(token) | Token::Erc721(token) | Token::Erc1155(token) => token.validate(),
        }
    }
}

impl Validate for SplToken {
    fn validate(&self) -> Result<(), candid::Error> {
        use crate::types::MAX_SYMBOL_LENGTH;
        if let Some(symbol) = &self.symbol {
            if symbol.chars().count() > MAX_SYMBOL_LENGTH {
                return Err(candid::Error::msg(format!(
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
    fn validate(&self) -> Result<(), candid::Error> {
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

impl Validate for UserToken {
    fn validate(&self) -> Result<(), candid::Error> {
        if self.contract_address.len() != EVM_CONTRACT_ADDRESS_LENGTH {
            return Err(candid::Error::msg("Invalid EVM contract address length"));
        }
        if let Some(symbol) = &self.symbol {
            if symbol.len() > MAX_SYMBOL_LENGTH {
                return Err(candid::Error::msg(format!(
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

// Apply the validation during deserialization for all types
validate_on_deserialize!(Contact);
validate_on_deserialize!(ContactAddressData);
validate_on_deserialize!(CreateContactRequest);
validate_on_deserialize!(UpdateContactRequest);
validate_on_deserialize!(ContactImage);
validate_on_deserialize!(CustomToken);
validate_on_deserialize!(CustomTokenId);
validate_on_deserialize!(IcrcToken);
validate_on_deserialize!(SplToken);
validate_on_deserialize!(SplTokenId);
validate_on_deserialize!(ErcToken);
validate_on_deserialize!(ErcTokenId);
validate_on_deserialize!(UserToken);
