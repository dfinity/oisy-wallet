use candid::{CandidType, Deserialize};

use crate::types::Version;

pub const MAX_DISMISSED_NOTIFICATIONS_LIST_LENGTH: usize = 1000;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Default)]
pub struct NotificationSettings {
    pub dismissed_notifications: Vec<String>,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub enum AddDismissedNotificationError {
    NotificationIdTooLong,
    TooManyNotificationIds,
    UserNotFound,
    VersionMismatch,
    MaxDismissedNotifications,
}

#[derive(CandidType, Deserialize, Clone, Eq, PartialEq, Debug)]
pub struct AddDismissedNotificationRequest {
    pub notification_ids: Vec<String>,
    pub current_user_version: Option<Version>,
}

impl AddDismissedNotificationRequest {
    pub const MAX_BATCH_SIZE: usize = 100;
    /// SHA-256 hex string is 64 chars; compound IDs with a qualifier use `:` separator.
    pub const MAX_ID_LEN: usize = 128;

    /// Checks whether the request is syntactically valid.
    ///
    /// # Errors
    /// - If the batch is too large.
    /// - If any notification ID is too long.
    pub fn check(&self) -> Result<(), AddDismissedNotificationError> {
        if self.notification_ids.len() > Self::MAX_BATCH_SIZE {
            return Err(AddDismissedNotificationError::TooManyNotificationIds);
        }
        for id in &self.notification_ids {
            if id.len() > Self::MAX_ID_LEN {
                return Err(AddDismissedNotificationError::NotificationIdTooLong);
            }
        }
        Ok(())
    }
}
