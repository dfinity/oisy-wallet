//! End to end tests for migration.

use std::sync::Arc;

use candid::Principal;
use pocket_ic::PocketIcBuilder;
use shared::types::{
    custom_token::{CustomToken, IcrcToken, Token},
    ApiEnabled, Guards, MigrationProgress, MigrationReport, Stats,
};

use crate::{
    user_token::{ANOTHER_TOKEN, MOCK_TOKEN},
    utils::pocketic::{controller, setup, BackendBuilder, PicBackend, PicCanisterTrait},
};

struct MigrationTestEnv {
    /// The old backend canister ID, from which data is being migrated.
    old_backend: PicBackend,
    /// The new backend canister ID.
    new_backend: PicBackend,
}

impl Default for MigrationTestEnv {
    fn default() -> Self {
        let mut pic = Arc::new(
            PocketIcBuilder::new()
                .with_bitcoin_subnet()
                .with_ii_subnet()
                .with_fiduciary_subnet()
                .build(),
        );
        let old_backend = PicBackend {
            pic: pic.clone(),
            canister_id: BackendBuilder::default().deploy_to(&mut pic),
        };
        let new_controllers = [
            BackendBuilder::default_controllers(),
            vec![old_backend.canister_id()],
        ]
        .concat();
        let new_backend = PicBackend {
            pic: pic.clone(),
            canister_id: BackendBuilder::default()
                .with_controllers(new_controllers)
                .deploy_backend(&mut pic),
        };
        MigrationTestEnv {
            old_backend,
            new_backend,
        }
    }
}

impl MigrationTestEnv {
    /// Creates a test environment with the given stats.
    fn new(stats: &Stats) -> Self {
        let pic_setup = MigrationTestEnv::default();
        let Stats {
            user_profile_count,
            user_timestamps_count,
            user_token_count,
            custom_token_count,
        } = stats;
        assert_eq!(user_profile_count, user_timestamps_count, "Test setup failure: Stats indicate that the database is inconsistent.  Doesn't affect the migration but should be fixed.");
        // Create users
        let expected_users = pic_setup.old_backend.create_users(
            0..u8::try_from(*user_profile_count).expect("Test setup requested too many users"),
        );
        // Create users with tokens.
        let user_tokens = vec![MOCK_TOKEN.clone(), ANOTHER_TOKEN.clone()];
        for user in &expected_users[0..*user_token_count as usize] {
            pic_setup
                .old_backend
                .update::<()>(user.principal, "set_many_user_tokens", &user_tokens)
                .expect("Test setup error: Failed to set user tokens");
        }
        // Create custom tokens
        let custom_tokens = vec![CustomToken {
            token: Token::Icrc(IcrcToken {
                ledger_id: Principal::from_text("uf2wh-taaaa-aaaaq-aabna-cai".to_string()).unwrap(),
                index_id: Some(
                    Principal::from_text("ux4b6-7qaaa-aaaaq-aaboa-cai".to_string()).unwrap(),
                ),
            }),
            enabled: true,
            version: None,
        }];
        for user in expected_users
            .iter()
            .rev()
            .take(*custom_token_count as usize)
        {
            pic_setup
                .old_backend
                .update::<()>(user.principal, "set_many_custom_tokens", &custom_tokens)
                .expect("Test setup error: Failed to set user tokens");
        }
        pic_setup
    }

    /// Gets the old backend migration state.
    fn migration_state(&self) -> Option<MigrationReport> {
        self.old_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ())
            .expect("Failed to get migration report")
    }

    /// Steps the migration.
    fn step_migration(&self) {
        self.old_backend
            .update::<()>(controller(), "step_migration", ())
            .expect("Failed to stop migration timer")
    }

    /// Verifies that the migration is in an expected state.
    fn assert_migration_is(&self, expected: Option<MigrationReport>) {
        assert_eq!(self.migration_state(), expected,);
    }

    /// Verifies that migration progress is as expected.
    fn assert_migration_progress_is(&self, expected: MigrationProgress) {
        assert_eq!(
            self.old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ())
                .expect("Failed to get migration report")
                .expect("Migration should be in progress")
                .progress,
            expected,
        );
    }

    /// Verifies that old and new canister locks are as expected.
    fn assert_canister_locks_are(&self, old: Option<Guards>, new: Option<Guards>, context: &str) {
        assert_eq!(
            self.old_backend
                .query::<shared::types::Config>(controller(), "config", ())
                .expect("Failed to get config")
                .api,
            old,
            "Old canister locks are not as expected {}",
            context
        );
        assert_eq!(
            self.new_backend
                .query::<shared::types::Config>(controller(), "config", ())
                .expect("Failed to get config")
                .api,
            new,
            "New canister locks are not as expected {}",
            context
        );
    }
}

#[test]
fn test_by_default_no_migration_is_in_progress() {
    let pic_setup = setup();

    let get_migration_response =
        pic_setup.query::<Option<MigrationReport>>(controller(), "migration", ());

    assert_eq!(
        get_migration_response,
        Ok(None),
        "By default, no migration should be in progress"
    );
}

#[test]
fn test_migration() {
    let stats = Stats {
        user_profile_count: 20,
        user_timestamps_count: 20,
        user_token_count: 10,
        custom_token_count: 5,
    };
    let pic_setup = MigrationTestEnv::new(&stats);
    // Test the migration.
    //
    // Initially no migration should be in progress.
    pic_setup.assert_migration_is(None);
    // There should be users in the old backend.
    assert_eq!(
        pic_setup
            .old_backend
            .query::<Stats>(controller(), "stats", ()),
        Ok(stats),
        "Initially, there should be users in the old backend"
    );
    // There should be no users in the new backend.
    assert_eq!(
        pic_setup
            .new_backend
            .query::<Stats>(controller(), "stats", ()),
        Ok(Stats::default()),
        "Initially, there should be no users in the new backend"
    );
    // Initially no migrations should be in progress.
    assert_eq!(
        pic_setup
            .old_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ()),
        Ok(None),
        "Initially, no migration should be in progress"
    );
    assert_eq!(
        pic_setup
            .new_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ()),
        Ok(None),
        "Initially, no migration should be in progress"
    );
    // Start migration
    {
        assert_eq!(
            pic_setup
                .old_backend
                .update::<Result<MigrationReport, String>>(
                    controller(),
                    "migrate_user_data_to",
                    pic_setup.new_backend.canister_id()
                )
                .expect("Failed to start migration"),
            Ok(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::Pending
            }),
        );
        // Stop the timer so that we can control the migration.
        assert_eq!(
            pic_setup
                .old_backend
                .update::<Result<(), String>>(controller(), "migration_stop_timer", ())
                .expect("Failed to stop migration timer"),
            Ok(()),
        );
        // Migration should be in progress.
        pic_setup.assert_migration_progress_is(MigrationProgress::Pending);
    }
    // Step the migration: User data writing should be locked.
    {
        pic_setup.step_migration();
        pic_setup.assert_migration_progress_is(MigrationProgress::LockingTarget);
        pic_setup.assert_canister_locks_are(
            Some(Guards {
                threshold_key: ApiEnabled::ReadOnly,
                user_data: ApiEnabled::ReadOnly,
            }),
            None,
            "after locking the source canister",
        );
    }
    // Step the migration: Target canister should be locked.
    {
        pic_setup.step_migration();
        pic_setup.assert_migration_progress_is(MigrationProgress::CheckingTarget);
        // Check that the target really is locked:
        pic_setup.assert_canister_locks_are(
            Some(Guards {
                threshold_key: ApiEnabled::ReadOnly,
                user_data: ApiEnabled::ReadOnly,
            }),
            Some(Guards {
                threshold_key: ApiEnabled::Disabled,
                user_data: ApiEnabled::Disabled,
            }),
            "after locking the target canister",
        );
    }
    // Step the migration: Should have started the user token migration.
    {
        pic_setup.step_migration();
        pic_setup.assert_migration_progress_is(MigrationProgress::MigratedUserTokensUpTo(None));
    }
    // Keep stepping until the user tokens have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedUserTokensUpTo(_),
            ..
        }) = pic_setup.migration_state()
        {
            pic_setup.step_migration();
        }
    }
    // Should have started the custom token migration.
    {
        pic_setup.assert_migration_progress_is(MigrationProgress::MigratedCustomTokensUpTo(None));
    }
    // Keep stepping until the custom tokens have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedCustomTokensUpTo(_),
            ..
        }) = pic_setup.migration_state()
        {
            pic_setup.step_migration();
        }
    }
    // Should have started the user timestamp migration.
    {
        pic_setup.assert_migration_progress_is(MigrationProgress::MigratedUserTimestampsUpTo(None));
    }
    // Keep stepping until the user timestamps have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedUserTimestampsUpTo(_),
            ..
        }) = pic_setup.migration_state()
        {
            pic_setup.step_migration();
        }
    }
    // Should have started the user profile migration.
    {
        pic_setup.assert_migration_progress_is(MigrationProgress::MigratedUserProfilesUpTo(None));
    }
    // Keep stepping until the user profiles have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedUserProfilesUpTo(_),
            ..
        }) = pic_setup.migration_state()
        {
            pic_setup.step_migration();
        }
    }
    // Should be checking the migration.
    {
        pic_setup.assert_migration_progress_is(MigrationProgress::CheckingDataMigration);
    }
    // Step the migration.  Should be unlocking.
    {
        pic_setup.step_migration();
        pic_setup.assert_migration_progress_is(MigrationProgress::UnlockingTarget);
        pic_setup.step_migration();
        pic_setup.assert_canister_locks_are(
            Some(Guards {
                threshold_key: ApiEnabled::ReadOnly,
                user_data: ApiEnabled::ReadOnly,
            }),
            Some(Guards {
                threshold_key: ApiEnabled::Disabled,
                user_data: ApiEnabled::Enabled,
            }),
            "after locking the target canister",
        );
        pic_setup.assert_migration_progress_is(MigrationProgress::Unlocking);
        pic_setup.step_migration();
        pic_setup.assert_canister_locks_are(
            Some(Guards {
                threshold_key: ApiEnabled::Enabled,
                user_data: ApiEnabled::Disabled,
            }),
            Some(Guards {
                threshold_key: ApiEnabled::Disabled,
                user_data: ApiEnabled::Enabled,
            }),
            "after locking the target canister",
        );
    }
    // Step the migration: Migration should be complete, and stay complete.
    {
        for _ in 0..5 {
            pic_setup.step_migration();
            pic_setup.assert_migration_progress_is(MigrationProgress::Completed);
        }
    }
    // Finally, make sure that the new canister has all the data.
    {
        assert_eq!(
            pic_setup
                .new_backend
                .query::<Stats>(controller(), "stats", ()),
            Ok(stats),
            "Initially, there should be users in the old backend"
        );
    }
}
