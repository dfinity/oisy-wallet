use crate::{Candid, StoredPrincipal, VMem};
use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::{
    user_profile::{
        AddUserCredentialError, GetUserProfileError, StoredUserProfile, UserCredential,
    },
    CredentialType,
};

pub fn get_profile(
    principal: StoredPrincipal,
    user_profile_map: &mut StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
    user_profile_updated_map: &mut StableBTreeMap<StoredPrincipal, u64, VMem>,
) -> Result<StoredUserProfile, GetUserProfileError> {
    if let Some(updated) = user_profile_updated_map.get(&principal) {
        return Ok(user_profile_map
            .get(&(updated, principal))
            .expect("Failed to fetch user from user profile map but it's present in updated map")
            .clone());
    }
    Err(GetUserProfileError::NotFound)
}

pub fn create_profile(
    principal: StoredPrincipal,
    user_profile_map: &mut StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
    user_profile_updated_map: &mut StableBTreeMap<StoredPrincipal, u64, VMem>,
) -> StoredUserProfile {
    if let Some(updated) = user_profile_updated_map.get(&principal) {
        user_profile_map
            .get(&(updated, principal))
            .expect("Failed to fetch user from user profile map but it's present in updated map")
            .clone()
    } else {
        let now = time();
        let default_profile = StoredUserProfile::from_timestamp(now);
        user_profile_updated_map.insert(principal, now);
        user_profile_map.insert((now, principal), Candid(default_profile.clone()));
        default_profile
    }
}

pub fn add_credential(
    principal: StoredPrincipal,
    credential_type: CredentialType,
    user_profile_map: &mut StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
    user_profile_updated_map: &mut StableBTreeMap<StoredPrincipal, u64, VMem>,
) -> Result<(), AddUserCredentialError> {
    if let Ok(user_profile) = get_profile(principal, user_profile_map, user_profile_updated_map) {
        let now = time();
        let user_credential = UserCredential {
            credential_type: credential_type.clone(),
            verified_date_timestamp: Some(now),
        };
        let mut credentials = user_profile.credentials.clone();
        credentials.insert(credential_type.clone(), user_credential);
        let updated_profile = StoredUserProfile {
            created_timestamp: user_profile.created_timestamp,
            updated_timestamp: now,
            version: Some(user_profile.version.map(|v| v + 1).unwrap_or(1)),
            credentials,
        };
        user_profile_updated_map.insert(principal, now);
        user_profile_map.insert((now, principal), Candid(updated_profile));
        Ok(())
    } else {
        Err(AddUserCredentialError::UserNotFound)
    }
}
