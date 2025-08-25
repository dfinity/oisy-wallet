use crate::utils::mock::{CALLER, CALLER_ETH_ADDRESS};
use crate::utils::pocketic::{setup, update_call};
use candid::Principal;

#[test]
fn test_caller_eth_address() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address = update_call::<String>(&pic_setup, caller, "caller_eth_address", ())
        .expect("Failed to call eth address.");

    assert_eq!(address, CALLER_ETH_ADDRESS.to_string());
}

#[test]
fn test_eth_address_of() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address = update_call::<String>(&pic_setup, caller, "eth_address_of", caller)
        .expect("Failed to call eth address of.");

    assert_eq!(address, CALLER_ETH_ADDRESS.to_string());
}

#[test]
fn test_anonymous_cannot_call_eth_address() {
    let pic_setup = setup();

    let address =
        update_call::<String>(&pic_setup, Principal::anonymous(), "caller_eth_address", ());

    assert!(address.is_err());
    assert_eq!(
        address.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_non_allowed_caller_cannot_call_eth_address_of() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address =
        update_call::<String>(&pic_setup, Principal::anonymous(), "eth_address_of", caller);

    assert!(address.is_err());
    assert_eq!(address.unwrap_err(), "Caller is not allowed.".to_string());
}

#[test]
fn test_cannot_call_eth_address_of_for_anonymous() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address =
        update_call::<String>(&pic_setup, caller, "eth_address_of", Principal::anonymous());

    assert!(address.is_err());
    assert!(address
        .unwrap_err()
        .contains("Anonymous principal is not authorized"));
}
