use std::collections::BTreeSet;

use candid::{CandidType, Deserialize};

use crate::types::Version;

pub const MAX_DISMISSED_NOTIFICATIONS_LIST_LENGTH: usize = 1000;

#[derive(CandidType, Deserialize, Clone, Debug, Eq, PartialEq, Hash, Ord, PartialOrd)]
pub enum SimpleNotificationKind {
    BtcActivityInfo,
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
    pub fn check(&self) -> Result<(), AddDismissedNotificationError> {
        if self.notifications.len() > Self::MAX_BATCH_SIZE {
            return Err(AddDismissedNotificationError::TooManyNotifications);
        }
        Ok(())
    }
}
