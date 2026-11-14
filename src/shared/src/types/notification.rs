use std::collections::BTreeSet;

use candid::{CandidType, Deserialize};

use crate::types::Version;

pub const MAX_DISMISSED_NOTIFICATIONS_LIST_LENGTH: usize = 1000;

/// Maximum length, in bytes, of the `qualifier` of a qualified notification.
///
/// The frontend qualifies a notification with a token symbol and cuts a longer one to this length.
pub const MAX_NOTIFICATION_QUALIFIER_LEN: usize = 64;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Hash, Ord, PartialOrd)]
pub enum SimpleNotificationKind {
    BtcActivityInfo,
    HiddenMicroTransactions,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Hash, Ord, PartialOrd)]
pub enum QualifiedNotificationKind {
    NoIndexCanister,
    UnavailableIndexCanister,
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Hash, Ord, PartialOrd)]
pub enum DismissedNotification {
    Simple {
        kind: SimpleNotificationKind,
        version: u32,
    },
    Qualified {
        kind: QualifiedNotificationKind,
        qualifier: String,
        version: u32,
    },
}

impl DismissedNotification {
    /// Whether the notification has no qualifier, or one no longer than
    /// [`MAX_NOTIFICATION_QUALIFIER_LEN`].
    #[must_use]
    pub fn has_valid_qualifier(&self) -> bool {
        match self {
            DismissedNotification::Simple { .. } => true,
            DismissedNotification::Qualified { qualifier, .. } => {
                qualifier.len() <= MAX_NOTIFICATION_QUALIFIER_LEN
            }
        }
    }
}

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct NotificationSettings {
    pub dismissed_notifications: BTreeSet<DismissedNotification>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddDismissedNotificationError {
    TooManyNotifications,
    UserNotFound,
    VersionMismatch,
    MaxDismissedNotifications,
    QualifierTooLong,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddDismissedNotificationRequest {
    pub notifications: Vec<DismissedNotification>,
    pub current_user_version: Option<Version>,
}

impl AddDismissedNotificationRequest {
    pub const MAX_BATCH_SIZE: usize = 100;

    /// Checks whether the request is syntactically valid.
    ///
    /// # Errors
    /// - If the batch is too large.
    /// - If a qualifier is longer than [`MAX_NOTIFICATION_QUALIFIER_LEN`].
    pub fn check(&self) -> Result<(), AddDismissedNotificationError> {
        if self.notifications.len() > Self::MAX_BATCH_SIZE {
            return Err(AddDismissedNotificationError::TooManyNotifications);
        }
        if !self
            .notifications
            .iter()
            .all(DismissedNotification::has_valid_qualifier)
        {
            return Err(AddDismissedNotificationError::QualifierTooLong);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::{
        AddDismissedNotificationError, AddDismissedNotificationRequest, DismissedNotification,
        QualifiedNotificationKind, SimpleNotificationKind, MAX_NOTIFICATION_QUALIFIER_LEN,
    };

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

    fn request(notifications: Vec<DismissedNotification>) -> AddDismissedNotificationRequest {
        AddDismissedNotificationRequest {
            notifications,
            current_user_version: None,
        }
    }

    #[test]
    fn accepts_a_qualifier_at_the_limit() {
        let at_limit = "a".repeat(MAX_NOTIFICATION_QUALIFIER_LEN);

        assert_eq!(
            request(vec![simple(), qualified("ICP"), qualified(&at_limit)]).check(),
            Ok(())
        );
    }

    #[test]
    fn refuses_a_qualifier_over_the_limit() {
        let over_limit = "a".repeat(MAX_NOTIFICATION_QUALIFIER_LEN + 1);

        assert_eq!(
            request(vec![qualified("ICP"), qualified(&over_limit)]).check(),
            Err(AddDismissedNotificationError::QualifierTooLong)
        );
    }

    #[test]
    fn counts_the_qualifier_in_bytes() {
        // 'é' takes two bytes, so this is half the limit in characters and one byte over it.
        let over_limit = format!("{}a", "é".repeat(MAX_NOTIFICATION_QUALIFIER_LEN / 2));

        assert!(!qualified(&over_limit).has_valid_qualifier());
    }

    #[test]
    fn refuses_a_batch_over_the_size_limit() {
        let notifications =
            vec![qualified("ICP"); AddDismissedNotificationRequest::MAX_BATCH_SIZE + 1];

        assert_eq!(
            request(notifications).check(),
            Err(AddDismissedNotificationError::TooManyNotifications)
        );
    }
}
