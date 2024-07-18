use crate::{Candid, StoredPrincipal, VMem};
use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::user_profile::{GetUserProfileError, StoredUserProfile};

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
