use candid::Principal;

use crate::utils::{
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

#[test]
fn test_get_api_doc_is_a_public_query() {
    let pic_setup = setup();
    let caller = Principal::from_text(CALLER).unwrap();

    let doc = pic_setup
        .query::<String>(caller, "get_api_doc", ())
        .expect("Failed to query API documentation");

    assert!(doc.starts_with("# OISY backend API guide"));
    // Normalise whitespace so rewrapping the guide doesn't break the assertion.
    let doc = doc.split_whitespace().collect::<Vec<_>>().join(" ");
    assert!(doc.contains("Candid interface"));
}
