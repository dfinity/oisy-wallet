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
            CustomToken, CustomTokenId, Erc20Token, Erc721Token, ErcTokenId, IcrcToken, SplToken,
            SplTokenId, Token,
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

// Constants for validation limits
const CONTACT_MAX_NAME_LENGTH: usize = 100;
const CONTACT_MAX_ADDRESSES: usize = 40;
const CONTACT_MAX_LABEL_LENGTH: usize = 50;

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
            Token::Erc20(Erc20Token {
                token_address,
                chain_id,
                ..
            })
            | Token::Erc721(Erc721Token {
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
            Token::Erc20(token) => token.validate(),
            Token::Erc721(token) => token.validate(),
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

impl Validate for Erc20Token {
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

impl Validate for Erc721Token {
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
        // Check image size limit
        if self.data.len() > crate::types::contact::MAX_IMAGE_SIZE_BYTES {
            return Err(Error::msg(format!(
                "Image too large: {} bytes, max allowed is {} bytes",
                self.data.len(),
                crate::types::contact::MAX_IMAGE_SIZE_BYTES
            )));
        }

        // Check magic bytes to ensure the data matches the declared MIME type
        self.validate_magic_bytes()?;

        Ok(())
    }
}

impl ContactImage {
    /// Validates that the image data matches the declared MIME type by checking magic bytes
    fn validate_magic_bytes(&self) -> Result<(), Error> {
        let data = &self.data;

        match &self.mime_type {
            crate::types::contact::ImageMimeType::Jpeg => {
                if data.len() < 2 || data[0] != 0xFF || data[1] != 0xD8 {
                    return Err(Error::msg(
                        "Invalid JPEG format: missing or incorrect JPEG header",
                    ));
                }
            }
            crate::types::contact::ImageMimeType::Png => {
                let png_header = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                if data.len() < 8 || !data.starts_with(&png_header) {
                    return Err(Error::msg(
                        "Invalid PNG format: missing or incorrect PNG header",
                    ));
                }
            }
            crate::types::contact::ImageMimeType::Gif => {
                if data.len() < 6 {
                    return Err(Error::msg("Invalid GIF format: file too short"));
                }
                let gif87a = b"GIF87a";
                let gif89a = b"GIF89a";
                if !data.starts_with(gif87a) && !data.starts_with(gif89a) {
                    return Err(Error::msg(
                        "Invalid GIF format: missing or incorrect GIF header",
                    ));
                }
            }
            crate::types::contact::ImageMimeType::Webp => {
                if data.len() < 12 {
                    return Err(Error::msg("Invalid WebP format: file too short"));
                }
                let riff = b"RIFF";
                let webp = b"WEBP";
                if !data.starts_with(riff) || !data[8..12].starts_with(webp) {
                    return Err(Error::msg(
                        "Invalid WebP format: missing or incorrect WebP header",
                    ));
                }
            }
        }

        Ok(())
    }

    /// Validates all image constraints: size, per-principal image count, and canister memory usage
    ///
    /// # Errors
    ///
    /// Returns `ContactError` if:
    /// - Image size is too large
    /// - Image format is invalid
    /// - Canister memory is near capacity
    /// - Too many contacts with images for this principal
    pub fn validate_all(
        &self,
        stored_contacts: &crate::types::contact::StoredContacts,
    ) -> Result<(), crate::types::contact::ContactError> {
        // Check image size first (fail fast for oversized images)
        if self.data.len() > crate::types::contact::MAX_IMAGE_SIZE_BYTES {
            return Err(crate::types::contact::ContactError::InvalidContactData);
        }

        // Check image format (magic bytes)
        self.validate()
            .map_err(|_| crate::types::contact::ContactError::InvalidContactData)?;

        // Comprehensive memory validation (includes projected memory usage)
        validate_memory_for_new_image(self.data.len(), stored_contacts)
            .map_err(|_| crate::types::contact::ContactError::InvalidContactData)?;

        Ok(())
    }
}

/// Counts the number of contacts with images for a specific principal
pub fn count_contacts_with_images(
    stored_contacts: &crate::types::contact::StoredContacts,
) -> usize {
    stored_contacts
        .contacts
        .values()
        .filter(|contact| contact.image.is_some())
        .count()
}

/// Calculates the total size of all images in the contact store
pub fn calculate_total_image_size(
    stored_contacts: &crate::types::contact::StoredContacts,
) -> usize {
    stored_contacts
        .contacts
        .values()
        .filter_map(|contact| contact.image.as_ref())
        .map(|image| image.data.len())
        .sum()
}

/// Validates that adding a new image won't exceed the per-principal image limit
pub fn validate_principal_memory_limit(
    stored_contacts: &crate::types::contact::StoredContacts,
    is_adding_new_image: bool,
) -> Result<(), Error> {
    if !is_adding_new_image {
        return Ok(());
    }

    let current_image_count = count_contacts_with_images(stored_contacts);
    if current_image_count >= crate::types::contact::MAX_IMAGES_PER_PRINCIPAL {
        return Err(Error::msg(format!(
            "Too many images: {} images already stored, max allowed is {}",
            current_image_count,
            crate::types::contact::MAX_IMAGES_PER_PRINCIPAL
        )));
    }

    Ok(())
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

        // Validate image if present
        if let Some(image) = &self.image {
            image.validate()?;
        }

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

        // Validate image if present
        if let Some(image) = &self.image {
            image.validate()?;
        }

        Ok(())
    }
}

impl crate::types::contact::CreateContactRequest {
    /// Validates the request with additional context about existing contacts and principal
    ///
    /// # Errors
    /// Returns `ContactError` if validation fails due to:
    /// - Invalid contact data (name, image format, etc.)
    /// - Too many contacts with images for this principal
    /// - Canister memory near capacity
    pub fn validate_with_context(
        &self,
        existing_contacts: &crate::types::contact::StoredContacts,
        _principal: &Principal,
    ) -> Result<(), crate::types::contact::ContactError> {
        // First run the basic validation
        self.validate()
            .map_err(|_| crate::types::contact::ContactError::InvalidContactData)?;

        // If we have an image, validate all additional constraints
        if let Some(image) = &self.image {
            image.validate_all(existing_contacts)?;
        }

        Ok(())
    }
}

/// Validates memory usage before adding images
/// Returns an error if the canister is at or above the memory threshold
pub fn validate_memory_usage() -> Result<(), crate::types::contact::ContactError> {
    // Check stable memory usage
    let stable_memory_size = ic_cdk::api::stable::stable_size();
    let max_stable_memory = 16384; // 1 GB in 64KB pages (16384 * 64KB = 1GB)

    #[allow(clippy::cast_precision_loss, clippy::cast_lossless)]
    let usage_ratio = stable_memory_size as f64 / max_stable_memory as f64;

    if usage_ratio > crate::types::contact::MEMORY_USAGE_THRESHOLD {
        return Err(crate::types::contact::ContactError::CanisterMemoryNearCapacity);
    }

    Ok(())
}

/// Get current memory usage information
/// Returns a tuple of (`used_memory_pages`, `max_memory_pages`, `usage_ratio`)
pub fn get_memory_usage_info() -> (u64, u64, f64) {
    let stable_memory_size = ic_cdk::api::stable::stable_size();
    let max_stable_memory = 16384; // 1 GB in 64KB pages

    #[allow(clippy::cast_precision_loss, clippy::cast_lossless)]
    let usage_ratio = stable_memory_size as f64 / max_stable_memory as f64;

    (stable_memory_size, max_stable_memory, usage_ratio)
}

/// Validates that adding a new image won't cause memory issues
/// This function performs a more comprehensive check considering the image size
pub fn validate_memory_for_new_image(
    image_size: usize,
    existing_contacts: &crate::types::contact::StoredContacts,
) -> Result<(), crate::types::contact::ContactError> {
    // First check current memory usage
    validate_memory_usage()?;

    // Check if the new image would push us over the limit
    let (used_pages, max_pages, _current_ratio) = get_memory_usage_info();

    // Estimate additional memory needed (conservative estimate)
    // Each page is 64KB, so convert image size to pages
    let additional_pages = image_size.div_ceil(65536);

    #[allow(clippy::cast_precision_loss, clippy::cast_lossless)]
    let projected_ratio = (used_pages + additional_pages as u64) as f64 / max_pages as f64;

    if projected_ratio > crate::types::contact::MEMORY_USAGE_THRESHOLD {
        return Err(crate::types::contact::ContactError::CanisterMemoryNearCapacity);
    }

    // Also check per-principal limits
    validate_principal_memory_limit(existing_contacts, true)
        .map_err(|_| crate::types::contact::ContactError::TooManyContactsWithImages)?;

    Ok(())
}

impl crate::types::contact::UpdateContactRequest {
    /// Validates the request with additional context about existing contacts and principal
    ///
    /// # Errors
    /// Returns `ContactError` if validation fails due to:
    /// - Invalid contact data (name, image format, etc.)
    /// - Too many contacts with images for this principal (when adding new image)
    /// - Canister memory near capacity
    pub fn validate_with_context(
        &self,
        existing_contacts: &crate::types::contact::StoredContacts,
        _principal: &Principal,
        is_adding_new_image: bool,
    ) -> Result<(), crate::types::contact::ContactError> {
        // First run the basic validation
        self.validate()
            .map_err(|_| crate::types::contact::ContactError::InvalidContactData)?;

        // If we have an image and we're adding a new one, validate all additional constraints
        if let Some(image) = &self.image {
            if is_adding_new_image {
                image.validate_all(existing_contacts)?;
            } else {
                // For updates that aren't adding new images, still validate memory and format
                validate_memory_usage()?;
                image
                    .validate()
                    .map_err(|_| crate::types::contact::ContactError::InvalidImageFormat)?;
            }
        }

        Ok(())
    }
}

impl crate::types::contact::StoredContacts {
    /// Get image statistics for this contact store
    #[must_use]
    pub fn get_image_statistics(&self) -> crate::types::contact::ImageStatistics {
        let total_contacts = self.contacts.len();
        let contacts_with_images = count_contacts_with_images(self);
        let total_image_size = calculate_total_image_size(self);

        crate::types::contact::ImageStatistics {
            total_contacts,
            contacts_with_images,
            total_image_size,
        }
    }

    /// Check if adding a new image would be allowed based on all constraints
    #[must_use]
    pub fn can_add_new_image(&self, image_size: usize) -> bool {
        // Check image size limit
        if image_size > crate::types::contact::MAX_IMAGE_SIZE_BYTES {
            return false;
        }

        // Check per-principal image count
        let current_image_count = count_contacts_with_images(self);
        if current_image_count >= crate::types::contact::MAX_IMAGES_PER_PRINCIPAL {
            return false;
        }

        // Check memory usage
        validate_memory_for_new_image(image_size, self).is_ok()
    }

    /// Get remaining image capacity for this principal
    #[must_use]
    pub fn get_remaining_image_capacity(&self) -> usize {
        let current_image_count = count_contacts_with_images(self);
        crate::types::contact::MAX_IMAGES_PER_PRINCIPAL.saturating_sub(current_image_count)
    }
}

// Apply the validation during deserialization for all types
validate_on_deserialize!(Contact);
validate_on_deserialize!(ContactAddressData);
validate_on_deserialize!(CreateContactRequest);
validate_on_deserialize!(UpdateContactRequest);
validate_on_deserialize!(CustomToken);
validate_on_deserialize!(CustomTokenId);
validate_on_deserialize!(IcrcToken);
validate_on_deserialize!(SplToken);
validate_on_deserialize!(SplTokenId);
validate_on_deserialize!(Erc20Token);
validate_on_deserialize!(ErcTokenId);
validate_on_deserialize!(Erc721Token);
validate_on_deserialize!(UserToken);
