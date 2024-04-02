mod utils;

use candid::Principal;
use utils::{setup, update_call};

#[test]
fn test_anonymous_cannot_add_user_token() {
    let pic_setup = setup();

    let result = update_call::<()>(pic_setup, Principal::anonymous(), "add_user_token", ());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}
