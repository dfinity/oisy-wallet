//! Drops the dismissed notifications whose qualifier is longer than
//! [`MAX_NOTIFICATION_QUALIFIER_LEN`] from the stored user profiles.
//!
//! New notifications are checked against the limit when they are added, but profiles written
//! before it may still hold longer qualifiers. This goes through every profile in timer batches
//! after an upgrade. A profile keeps its key, timestamps and version: only the notifications go.
//!
//! TODO: remove this module and its start in `post_upgrade` once every canister has been upgraded
//! past the release that ships it.

use std::{ops::Bound, time::Duration};

use ic_cdk_timers::set_timer;
#[cfg(doc)]
use shared::types::notification::MAX_NOTIFICATION_QUALIFIER_LEN;
use shared::types::{notification::DismissedNotification, Timestamp};

use crate::{
    state::{mutate_state, State},
    types::{Candid, StoredPrincipal},
};

/// The key of a profile in `user_profile`.
type ProfileKey = (Timestamp, StoredPrincipal);

/// Instructions a batch may use before the remaining profiles wait for the next batch.
///
/// A timer message may use 40B instructions, so the headroom above this budget leaves room for the
/// largest profile a batch may end on.
const BATCH_INSTRUCTION_BUDGET: u64 = 2_000_000_000;

/// Pause between batches, so that the cleanup leaves room for other messages.
const BATCH_INTERVAL: Duration = Duration::from_secs(1);

/// Starts the cleanup from the first profile.
pub(crate) fn start_long_qualifier_cleanup() {
    schedule_batch(None, 0);
}

fn schedule_batch(after: Option<ProfileKey>, cleaned_so_far: usize) {
    let delay = if after.is_none() {
        Duration::ZERO
    } else {
        BATCH_INTERVAL
    };

    set_timer(delay, async move {
        let (next, cleaned) = mutate_state(|s| {
            clean_batch(s, after, || {
                ic_cdk::api::instruction_counter() < BATCH_INSTRUCTION_BUDGET
            })
        });
        let cleaned_so_far = cleaned_so_far + cleaned;

        match next {
            Some(after) => schedule_batch(Some(after), cleaned_so_far),
            None => ic_cdk::println!(
                "Dropped long notification qualifiers from {cleaned_so_far} user profiles"
            ),
        }
    });
}

/// Cleans the profiles that come after `after`, one at a time, for as long as `within_budget`
/// holds, and always at least one, so that every batch makes progress.
///
/// Returns the key of the last profile cleaned while profiles remain, or `None` once all of them
/// are done, together with the number of profiles that changed.
fn clean_batch(
    s: &mut State,
    mut after: Option<ProfileKey>,
    mut within_budget: impl FnMut() -> bool,
) -> (Option<ProfileKey>, usize) {
    let mut cleaned = 0;

    loop {
        let next = match after {
            Some(after) => s
                .user_profile
                .keys_range((Bound::Excluded(after), Bound::Unbounded))
                .next(),
            None => s.user_profile.keys().next(),
        };
        let Some(key) = next else {
            return (None, cleaned);
        };

        if drop_long_qualifiers(s, key) {
            cleaned += 1;
        }
        after = Some(key);

        if !within_budget() {
            return (after, cleaned);
        }
    }
}

/// Drops the profile's dismissed notifications whose qualifier is too long and writes the profile
/// back under the same key. A profile without such a notification is left as it is.
fn drop_long_qualifiers(s: &mut State, key: ProfileKey) -> bool {
    let Some(Candid(mut profile)) = s.user_profile.get(&key) else {
        return false;
    };
    let Some(notifications) = profile
        .settings
        .as_mut()
        .and_then(|settings| settings.notifications.as_mut())
    else {
        return false;
    };

    let before = notifications.dismissed_notifications.len();
    notifications
        .dismissed_notifications
        .retain(DismissedNotification::has_valid_qualifier);
    if notifications.dismissed_notifications.len() == before {
        return false;
    }

    s.user_profile.insert(key, Candid(profile));
    true
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use candid::Principal;
    use pretty_assertions::assert_eq;
    use shared::types::{
        notification::{
            NotificationSettings, QualifiedNotificationKind, SimpleNotificationKind,
            MAX_NOTIFICATION_QUALIFIER_LEN,
        },
        settings::Settings,
        user_profile::StoredUserProfile,
    };

    use super::*;
    use crate::state::read_state;

    fn key(seed: u8) -> ProfileKey {
        (
            u64::from(seed) * 1_000,
            StoredPrincipal(Principal::from_slice(&[seed])),
        )
    }

    fn qualified(qualifier: &str) -> DismissedNotification {
        DismissedNotification::Qualified {
            kind: QualifiedNotificationKind::NoIndexCanister,
            qualifier: qualifier.to_string(),
            version: 1,
        }
    }

    fn simple() -> DismissedNotification {
        DismissedNotification::Simple {
            kind: SimpleNotificationKind::BtcActivityInfo,
            version: 1,
        }
    }

    fn long_qualifier() -> String {
        "a".repeat(MAX_NOTIFICATION_QUALIFIER_LEN + 1)
    }

    fn profile(notifications: Option<Vec<DismissedNotification>>) -> StoredUserProfile {
        let mut profile = StoredUserProfile::from_timestamp(1_000);
        profile.version = Some(7);
        profile.settings = Some(Settings {
            notifications: notifications.map(|notifications| NotificationSettings {
                dismissed_notifications: notifications.into_iter().collect(),
            }),
            ..Settings::default()
        });
        profile
    }

    /// Writes the profile as one written before the qualifier limit: storing does not check it.
    fn store(key: ProfileKey, profile: &StoredUserProfile) {
        mutate_state(|s| {
            s.user_profile.insert(key, Candid(profile.clone()));
            s.user_profile_updated.insert(key.1, key.0);
        });
    }

    fn stored(key: ProfileKey) -> Option<StoredUserProfile> {
        read_state(|s| s.user_profile.get(&key).map(|profile| profile.0))
    }

    fn dismissed(key: ProfileKey) -> BTreeSet<DismissedNotification> {
        stored(key)
            .and_then(|profile| profile.settings)
            .and_then(|settings| settings.notifications)
            .map(|notifications| notifications.dismissed_notifications)
            .unwrap_or_default()
    }

    #[test]
    fn drops_only_the_notifications_with_a_long_qualifier() {
        let k = key(1);
        let at_limit = "a".repeat(MAX_NOTIFICATION_QUALIFIER_LEN);
        store(
            k,
            &profile(Some(vec![
                simple(),
                qualified("ICP"),
                qualified(&at_limit),
                qualified(&long_qualifier()),
            ])),
        );

        let result = mutate_state(|s| clean_batch(s, None, || true));

        assert_eq!(result, (None, 1));
        assert_eq!(
            dismissed(k),
            BTreeSet::from([simple(), qualified("ICP"), qualified(&at_limit)])
        );
    }

    #[test]
    fn keeps_the_key_timestamps_and_version() {
        let k = key(1);
        store(k, &profile(Some(vec![qualified(&long_qualifier())])));

        mutate_state(|s| clean_batch(s, None, || true));

        let cleaned = stored(k).expect("the profile stays under its key");
        assert_eq!(cleaned, profile(Some(vec![])));
        read_state(|s| {
            assert_eq!(s.user_profile.len(), 1);
            assert_eq!(s.user_profile_updated.get(&k.1), Some(k.0));
        });
    }

    #[test]
    fn leaves_profiles_without_long_qualifiers_as_they_are() {
        let with_short = key(1);
        let without_notifications = key(2);
        let without_settings = key(3);
        store(with_short, &profile(Some(vec![qualified("ICP")])));
        store(without_notifications, &profile(None));
        let mut bare = StoredUserProfile::from_timestamp(1_000);
        bare.settings = None;
        store(without_settings, &bare);

        let result = mutate_state(|s| clean_batch(s, None, || true));

        assert_eq!(result, (None, 0));
        assert_eq!(
            stored(with_short),
            Some(profile(Some(vec![qualified("ICP")])))
        );
        assert_eq!(stored(without_notifications), Some(profile(None)));
        assert_eq!(stored(without_settings), Some(bare));
    }

    #[test]
    fn resumes_after_the_last_profile_of_a_batch() {
        let keys = [key(1), key(2), key(3)];
        for k in keys {
            store(
                k,
                &profile(Some(vec![qualified("ICP"), qualified(&long_qualifier())])),
            );
        }

        // A spent budget still cleans one profile per batch.
        let mut after = None;
        let mut batches = 0;
        let mut cleaned = 0;
        loop {
            let (next, batch_cleaned) = mutate_state(|s| clean_batch(s, after, || false));
            batches += 1;
            cleaned += batch_cleaned;
            match next {
                Some(next) => after = Some(next),
                None => break,
            }
        }

        assert_eq!((batches, cleaned), (4, 3));
        for k in keys {
            assert_eq!(dismissed(k), BTreeSet::from([qualified("ICP")]));
        }
    }

    #[test]
    fn running_again_changes_nothing() {
        let k = key(1);
        store(
            k,
            &profile(Some(vec![qualified("ICP"), qualified(&long_qualifier())])),
        );
        mutate_state(|s| clean_batch(s, None, || true));

        let result = mutate_state(|s| clean_batch(s, None, || true));

        assert_eq!(result, (None, 0));
        assert_eq!(dismissed(k), BTreeSet::from([qualified("ICP")]));
    }

    #[test]
    fn finishes_at_once_without_profiles() {
        let result = mutate_state(|s| clean_batch(s, None, || true));

        assert_eq!(result, (None, 0));
    }
}
