use crate::types::{Candid, StoredPrincipal, UserProfileMap, UserProfileUpdatedMap};
use shared::types::{user_profile::StoredUserProfile, Timestamp};

pub struct UserProfileModel<'a> {
    user_profile_map: &'a mut UserProfileMap,
    user_profile_updated_map: &'a mut UserProfileUpdatedMap,
}

/// `UserProfileModel` should be used to access and manage the state to user profiles in the stable memory
impl<'a> UserProfileModel<'a> {
    pub fn new(
        user_profile_map: &'a mut UserProfileMap,
        user_profile_updated_map: &'a mut UserProfileUpdatedMap,
    ) -> UserProfileModel<'a> {
        UserProfileModel {
            user_profile_map,
            user_profile_updated_map,
        }
    }

    pub fn find_by_principal(&self, user_principal: StoredPrincipal) -> Option<StoredUserProfile> {
        if let Some(updated) = self.user_profile_updated_map.get(&user_principal) {
            return self
                .user_profile_map
                .get(&(updated, user_principal))
                .map(|p| p.0);
        } else {
            None
        }
    }

    pub fn stor_new(
        &mut self,
        user_principal: StoredPrincipal,
        timestamp: Timestamp,
        new_user: &StoredUserProfile,
    ) {
        if let Some(old_updated) = self.user_profile_updated_map.get(&user_principal) {
            // Clean up old entries
            self.user_profile_map.remove(&(old_updated, user_principal));
        }
        self.user_profile_updated_map
            .insert(user_principal, timestamp);
        self.user_profile_map
            .insert((timestamp, user_principal), Candid(new_user.clone()));
    }
}
