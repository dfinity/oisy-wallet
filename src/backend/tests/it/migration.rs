//! End to end tests for migration.

use std::sync::Arc;

use crate::{
    user_token::{ANOTHER_TOKEN, MOCK_TOKEN},
    utils::pocketic::{controller, setup, BackendBuilder, PicBackend, PicCanisterTrait},
};
use candid::Principal;
use pocket_ic::PocketIc;
use shared::types::{
    custom_token::{CustomToken, IcrcToken, Token}, ApiEnabled, Guards, MigrationProgress, MigrationReport, Stats
};

struct MigrationTestEnv {
    /// Simulated Internet Computer
    pic: Arc<PocketIc>,
    /// The old backend canister ID, from which data is being migrated.
    old_backend: PicBackend,
    /// The new backend canister ID.
    new_backend: PicBackend,
}

impl Default for MigrationTestEnv {
    fn default() -> Self {
        let mut pic = Arc::new(PocketIc::new());
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
                .deploy_to(&mut pic),
        };
        MigrationTestEnv {
            pic,
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
        assert_eq!(user_profile_count, user_timestamps_count, "Test setup failure: Stats indicate that the database is inconsistent.  Donen't affect the migration but should be fixed.");
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
            .expect("Failed to stop migration tmer")
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
        // Migration should be in progress.
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::Pending,
            })),
            "Migration should be in progress"
        );
    }
    // Step the timer: User data writing should be locked.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::Locked,
            })),
            "Migration should be in progress"
        );
        let old_config = pic_setup
            .old_backend
            .query::<shared::types::Config>(controller(), "config", ())
            .expect("Failed to get config");
        assert_eq!(
            old_config.api,
            Some(Guards {
                threshold_key: ApiEnabled::ReadOnly,
                user_data: ApiEnabled::ReadOnly
            }),
            "Local user data writes should be locked."
        );
    }
    // Step the timer: Target canister should be locked.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::TargetLocked,
            })),
            "Migration should be in progress"
        );
        // Check that the target really is locked:
        let new_config = pic_setup
            .new_backend
            .query::<shared::types::Config>(controller(), "config", ())
            .expect("Failed to get config");
        assert_eq!(
            new_config.api,
            Some(Guards {
                threshold_key: ApiEnabled::ReadOnly,
                user_data: ApiEnabled::ReadOnly
            }),
            "Target canister user data writes should be locked."
        );
    }
    // Step the timer: Should have found the target canister to be empty.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::TargetPreCheckOk,
            })),
            "Migration should be in progress"
        );
    }
    // Step the timer: Should have started the user token migration.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::MigratedUserTokensUpTo(None),
            })),
            "Migration should be in progress"
        );
    }
    // Keep stepping until the user tokens have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedUserTokensUpTo(_),
            ..
        }) = pic_setup
            .old_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ())
            .expect("Failed to get migration report")
        {
            pic_setup.pic.tick();
        }
    }
}
