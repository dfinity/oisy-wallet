//! End to end tests for migration.

use crate::utils::pocketic::{controller, query_call, setup};
use shared::types::Migration;

#[test]
fn test_by_default_no_migration_is_in_progress() {
    let pic_setup = setup();

    let get_migration_response =
        query_call::<Option<Migration>>(&pic_setup, controller(), "migration", ());

    assert_eq!(
        get_migration_response,
        Ok(None),
        "By default, no migration should be in progress"
    );
}
