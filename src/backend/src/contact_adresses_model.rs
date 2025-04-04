use shared::types::{user_profile::StoredUserProfile, Timestamp};

use crate::types::{Candid, StoredPrincipal, UserProfileMap, UserProfileUpdatedMap};

pub struct UserProfileModel<'a> {
    user_profile_map: &'a mut UserProfileMap,
    user_profile_updated_map: &'a mut UserProfileUpdatedMap,
}

/// `UserProfileModel` should be used to access and manage the state to user profiles in the stable
/// memory
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
            self.user_profile_map
                .get(&(updated, user_principal))
                .map(|p| p.0)
        } else {
            None
        }
    }

    pub fn store_new(
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

    #[cfg(test)]
    fn assert_consistent(&self) {
        assert_eq!(
            self.user_profile_map.len(),
            self.user_profile_updated_map.len(),
            "The number of entries should be the same"
        );
        for (user_principal, timestamp) in self.user_profile_updated_map.iter() {
            assert!(
                self.user_profile_map
                    .contains_key(&(timestamp, user_principal)),
                "Profile map is missing user {}",
                user_principal.0.to_text()
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use candid::Principal;
    use ic_stable_structures::{
        memory_manager::{MemoryId, MemoryManager},
        DefaultMemoryImpl,
    };
    use shared::types::{user_profile::StoredUserProfile, Timestamp};

    use super::*;

    const USER_1: &str = "xzg7k-thc6c-idntg-knmtz-2fbhh-utt3e-snqw6-5xph3-54pbp-7axl5-tae";
    const USER_2: &str = "ufjdl-kewp5-bgfaq-d7k34-e5w62-nyad4-7r3s5-m2pt2-owqga-kcr5z-jae";

    fn prepare_btrees() -> (UserProfileMap, UserProfileUpdatedMap) {
        const USER_PROFILE_MEMORY_ID: MemoryId = MemoryId::new(3);
        const USER_PROFILE_UPDATED_MEMORY_ID: MemoryId = MemoryId::new(4);
        let memory = RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
        let user_profile_map = UserProfileMap::new(memory.borrow().get(USER_PROFILE_MEMORY_ID));
        let user_profile_updated_map =
            UserProfileUpdatedMap::new(memory.borrow().get(USER_PROFILE_UPDATED_MEMORY_ID));

        (user_profile_map, user_profile_updated_map)
    }

    #[test]
    fn test_find_by_principal_returns_profiles() {
        let (mut user_profile_map, mut user_profile_updated_map) = prepare_btrees();

        let user_principal =
            StoredPrincipal(Principal::from_text(USER_1).expect("invalid user principal"));
        let now: Timestamp = 12345667788223;
        let user_profile = StoredUserProfile::from_timestamp(now);
        user_profile_map.insert((now, user_principal), Candid(user_profile.clone()));
        user_profile_updated_map.insert(user_principal, now);

        let user_principal_2 =
            StoredPrincipal(Principal::from_text(USER_2).expect("invalid user principal"));
        let another_now: Timestamp = now + 400000000;
        let user_profile_2 = StoredUserProfile::from_timestamp(another_now);
        user_profile_map.insert(
            (another_now, user_principal_2),
            Candid(user_profile_2.clone()),
        );
        user_profile_updated_map.insert(user_principal_2, another_now);

        let user_profile_model =
            UserProfileModel::new(&mut user_profile_map, &mut user_profile_updated_map);

        assert_eq!(
            user_profile_model
                .find_by_principal(user_principal)
                .unwrap(),
            user_profile
        );

        assert_eq!(
            user_profile_model
                .find_by_principal(user_principal_2)
                .unwrap(),
            user_profile_2
        );
        user_profile_model.assert_consistent();
    }

    #[test]
    fn test_store_new_saves_profiles() {
        let (mut user_profile_map, mut user_profile_updated_map) = prepare_btrees();

        let user_principal =
            StoredPrincipal(Principal::from_text(USER_1).expect("invalid user principal"));
        let now: Timestamp = 12345667788223;
        let user_profile = StoredUserProfile::from_timestamp(now);
        user_profile_map.insert((now, user_principal), Candid(user_profile.clone()));
        user_profile_updated_map.insert(user_principal, now);

        let user_principal_2 =
            StoredPrincipal(Principal::from_text(USER_2).expect("invalid user principal"));
        let another_now: Timestamp = now + 400000000;
        let user_profile_2 = StoredUserProfile::from_timestamp(another_now);
        user_profile_map.insert(
            (another_now, user_principal_2),
            Candid(user_profile_2.clone()),
        );
        user_profile_updated_map.insert(user_principal_2, another_now);

        let mut user_profile_model =
            UserProfileModel::new(&mut user_profile_map, &mut user_profile_updated_map);

        let mut user_profile_2_updated = user_profile_2.clone();
        let later_timestamp = another_now + 400000000;
        user_profile_2_updated.updated_timestamp = later_timestamp;
        user_profile_model.store_new(user_principal_2, later_timestamp, &user_profile_2_updated);

        assert_eq!(
            user_profile_model
                .find_by_principal(user_principal_2)
                .unwrap(),
            user_profile_2_updated
        );

        assert_ne!(
            user_profile_model
                .find_by_principal(user_principal_2)
                .unwrap(),
            user_profile_2
        );

        // Check that first user is still there untouched
        assert_eq!(
            user_profile_model
                .find_by_principal(user_principal)
                .unwrap(),
            user_profile
        );
        user_profile_model.assert_consistent();
    }
}
