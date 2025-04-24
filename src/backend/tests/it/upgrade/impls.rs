use shared::types::{TokenVersion, Version};

use crate::upgrade::types::UserTokenV0_0_19;

impl TokenVersion for UserTokenV0_0_19 {
    fn get_version(&self) -> Option<Version> {
        self.version
    }

    fn with_incremented_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(cloned.version.unwrap_or_default().wrapping_add(1));
        cloned
    }

    fn with_initial_version(&self) -> Self {
        let mut cloned = self.clone();
        cloned.version = Some(1);
        cloned
    }
}
