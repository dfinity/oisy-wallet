use crate::{Candid, StoredPrincipal, VMem};
use ic_cdk::api::time;
use ic_stable_structures::StableBTreeMap;
use shared::types::user_profile::StoredUserProfile;

pub fn get_or_create(
    principal: StoredPrincipal,
    user_profile_map: &mut StableBTreeMap<(u64, StoredPrincipal), Candid<StoredUserProfile>, VMem>,
    user_profile_updated_map: &mut StableBTreeMap<StoredPrincipal, u64, VMem>,
) -> Candid<StoredUserProfile> {
    if let Some(updated) = user_profile_updated_map.get(&principal) {
        user_profile_map
            .get(&(updated, principal))
            .expect("Failed to fetch user from user profile map but it's present in updated map")
    } else {
        let now = time();
        let default_profile = StoredUserProfile::from_timestamp(now);
        user_profile_updated_map.insert(principal, now);
        user_profile_map.insert((now, principal), Candid(default_profile.clone()));
        Candid(default_profile)
    }
}
