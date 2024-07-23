use crate::{Candid, StoredPrincipal, VMem};
use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::{
    user_profile::{AddUserCredentialError, GetUserProfileError, StoredUserProfile},
    CredentialType, Timestamp, Version,
};

fn store_user_profile(
    principal: StoredPrincipal,
    timestamp: Timestamp,
    user: &StoredUserProfile,
    user_profile_map: &mut StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
    user_profile_updated_map: &mut StableBTreeMap<StoredPrincipal, u64, VMem>,
) {
    if let Some(old_updated) = user_profile_updated_map.get(&principal) {
        // Clean up old entries
        user_profile_map.remove(&(old_updated, principal));
    }
    user_profile_updated_map.insert(principal, timestamp);
    user_profile_map.insert((timestamp, principal), Candid(user.clone()));
}

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
        store_user_profile(
            principal,
            now,
            &default_profile,
            user_profile_map,
            user_profile_updated_map,
        );
        default_profile
    }
}

pub fn add_credential(
    principal: StoredPrincipal,
    profile_version: Option<Version>,
    credential_type: &CredentialType,
    user_profile_map: &mut StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
    user_profile_updated_map: &mut StableBTreeMap<StoredPrincipal, u64, VMem>,
) -> Result<(), AddUserCredentialError> {
    if let Ok(user_profile) = get_profile(principal, user_profile_map, user_profile_updated_map) {
        let now = time();
        if let Ok(new_profile) = user_profile.add_credential(profile_version, now, credential_type)
        {
            store_user_profile(
                principal,
                now,
                &new_profile,
                user_profile_map,
                user_profile_updated_map,
            );
            Ok(())
        } else {
            Err(AddUserCredentialError::VersionMismatch)
        }
    } else {
        Err(AddUserCredentialError::UserNotFound)
    }
}
