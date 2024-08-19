//! End to end tests for migration.

use std::sync::Arc;

use crate::{
    user_token::{ANOTHER_TOKEN, MOCK_TOKEN},
    utils::pocketic::{controller, setup, BackendBuilder, PicBackend, PicCanisterTrait},
};
use candid::Principal;
use pocket_ic::PocketIc;
use shared::types::{
    custom_token::{CustomToken, IcrcToken, Token},
    MigrationReport, Stats,
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
    let pic_setup = MigrationTestEnv::default();
    const NUM_USERS: u8 = 20;
    let user_range = 0..NUM_USERS;
    let expected_users = pic_setup.old_backend.create_users(user_range.clone());
    // Create users with tokens.
    let user_tokens = vec![MOCK_TOKEN.clone(), ANOTHER_TOKEN.clone()];
    const NUM_USERS_WITH_TOKENS: usize = 0;
    for user in &expected_users[0..NUM_USERS_WITH_TOKENS] {
        pic_setup
            .old_backend
            .update::<()>(user.principal, "set_many_user_tokens", &user_tokens)
            .expect("Test setup error: Failed to set user tokens");
    }
    // Create custom tokens
    const NUM_USERS_WITH_CUSTOM_TOKENS: usize = 0;
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
        .take(NUM_USERS_WITH_CUSTOM_TOKENS)
    {
        pic_setup
            .old_backend
            .update::<()>(user.principal, "set_many_custom_tokens", &custom_tokens)
            .expect("Test setup error: Failed to set user tokens");
    }

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
    // There should be users in the old backend.
    assert_eq!(
        pic_setup
            .old_backend
            .query::<Stats>(controller(), "stats", ()),
        Ok(Stats {
            user_profile_count: NUM_USERS as u64,
            custom_token_count: NUM_USERS_WITH_CUSTOM_TOKENS as u64,
            user_token_count: NUM_USERS_WITH_TOKENS as u64,
        }),
        "Initially, there should be users in the old backend"
    );
    // There should be no users in the new backend.
    assert_eq!(
        pic_setup
            .new_backend
            .query::<Stats>(controller(), "stats", ()),
        Ok(Stats {
            user_profile_count: 0,
            custom_token_count: 0,
            user_token_count: 0,
        }),
        "Initially, there should be no users in the new backend"
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
        // TODO: Check that the old backend really is locked.
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
        // TODO: Check that the target really is locked:
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
            "User token migration should be in progress"
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
    // Step the timer: Should have started the custom token migration.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::MigratedCustomTokensUpTo(None),
            })),
            "Custom token migration should be in progress"
        );
    }
    // Keep stepping until the custom tokens have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedCustomTokensUpTo(_),
            ..
        }) = pic_setup
            .old_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ())
            .expect("Failed to get migration report")
        {
            pic_setup.pic.tick();
        }
    }
    // Step the timer: Should have started the user timestamp migration migration.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::MigratedUserTimestampsUpTo(None),
            })),
            "User timestamp migration should be in progress"
        );
    }
    // Keep stepping until the user timestamps have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedUserTimestampsUpTo(_),
            ..
        }) = pic_setup
            .old_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ())
            .expect("Failed to get migration report")
        {
            pic_setup.pic.tick();
        }
    }
    // Step the timer: Should have started the user profile migration.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::MigratedUserProfilesUpTo(None),
            })),
            "User timestamp migration should be in progress"
        );
    }
    // Keep stepping until the user profiles have been migrated.
    {
        while let Some(MigrationReport {
            progress: shared::types::MigrationProgress::MigratedUserProfilesUpTo(_),
            ..
        }) = pic_setup
            .old_backend
            .query::<Option<MigrationReport>>(controller(), "migration", ())
            .expect("Failed to get migration report")
        {
            pic_setup.pic.tick();
        }
    }
    // Step the timer: Should be checking the migration.
    {
        pic_setup.pic.tick();
        assert_eq!(
            pic_setup
                .old_backend
                .query::<Option<MigrationReport>>(controller(), "migration", ()),
            Ok(Some(MigrationReport {
                to: pic_setup.new_backend.canister_id(),
                progress: shared::types::MigrationProgress::CheckingTargetCanister,
            })),
            "Should be checking that all data bas been migrated to the target canister"
        );
    }
    // Step the timer: Migration should be complete, and stay complete.
    {
        for stepnum in 0..5 {
            pic_setup.pic.tick();
            assert_eq!(
                pic_setup.old_backend.query::<Option<MigrationReport>>(
                    controller(),
                    "migration",
                    ()
                ),
                Ok(Some(MigrationReport {
                    to: pic_setup.new_backend.canister_id(),
                    progress: shared::types::MigrationProgress::Completed,
                })),
                "Should be completed {} steps after the migration finished.",
                stepnum
            );
        }
    }
}
