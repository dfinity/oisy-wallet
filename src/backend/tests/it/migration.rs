//! End to end tests for migration.

use crate::utils::pocketic::{controller, query_call, setup};
use shared::types::MigrationReport;

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
    let pic_setup = setup();

    assert_eq!(
        query_call::<Option<MigrationReport>>(&pic_setup, controller(), "migration", ()),
        Ok(None),
        "Initially, no migration should be in progress"
    );
}
