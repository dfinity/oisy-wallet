//! End to end tests for migration.

use std::sync::Arc;

use crate::utils::pocketic::{controller, query_call, setup, BackendBuilder, PicCanister, PicCanisterTrait};
use pocket_ic::PocketIc;
use shared::types::MigrationReport;

struct MigrationTestEnv {
    /// Simulated Internet Computer
    pic: Arc<PocketIc>,
    /// The old backend canister ID, from which data is being migrated.
    old_backend: PicCanister,
    /// The new backend canister ID.
    new_backend: PicCanister,
}

impl Default for MigrationTestEnv {
    fn default() -> Self {
        let mut pic = Arc::new(PocketIc::new());
        let old_backend = PicCanister{pic: pic.clone(), canister_id: BackendBuilder::default().deploy_to(&mut pic)};
        let new_controllers = [BackendBuilder::default_controllers(), vec![old_backend.canister_id()]].concat();
        let new_backend = PicCanister{pic: pic.clone(), canister_id: BackendBuilder::default()
            .with_controllers(new_controllers)
            .deploy_to(&mut pic)};

        old_backend.create_users(1, 5);

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
        query_call::<Option<MigrationReport>>(&pic_setup, controller(), "migration", ());

    assert_eq!(
        get_migration_response,
        Ok(None),
        "By default, no migration should be in progress"
    );
}

#[test]
fn test_empty_migration() {
    let pic_setup = MigrationTestEnv::default();

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

}
