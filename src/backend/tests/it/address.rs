use crate::utils::mock::{
    CALLER, CALLER_BTC_ADDRESS_MAINNET, CALLER_BTC_ADDRESS_TESTNET, CALLER_ETH_ADDRESS,
};
use crate::utils::pocketic::{setup, PicCanisterTrait};
use candid::Principal;
use ic_cdk::api::management_canister::bitcoin::BitcoinNetwork;

#[test]
fn test_caller_eth_address() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address = pic_setup
        .update::<String>(caller, "caller_eth_address", ())
        .expect("Failed to call eth address.");

    assert_eq!(address, CALLER_ETH_ADDRESS.to_string());
}

#[test]
fn test_eth_address_of() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address = pic_setup
        .update::<String>(caller, "eth_address_of", caller)
        .expect("Failed to call eth address of.");

    assert_eq!(address, CALLER_ETH_ADDRESS.to_string());
}

#[test]
fn test_anonymous_cannot_call_eth_address() {
    let pic_setup = setup();

    let address = pic_setup.update::<String>(Principal::anonymous(), "caller_eth_address", ());

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

    let address = pic_setup.update::<String>(Principal::anonymous(), "eth_address_of", caller);

    assert!(address.is_err());
    assert_eq!(address.unwrap_err(), "Caller is not allowed.".to_string());
}

#[test]
fn test_cannot_call_eth_address_of_for_anonymous() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let address = pic_setup.update::<String>(caller, "eth_address_of", Principal::anonymous());

    assert!(address.is_err());
    assert!(address
        .unwrap_err()
        .contains("Anonymous principal is not authorized"));
}

#[test]
fn test_caller_btc_address_mainnet() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();
    let network = BitcoinNetwork::Mainnet;

    let address = pic_setup
        .update::<String>(caller, "caller_btc_address", network)
        .expect("Failed to call mainnet btc address.");

    assert_eq!(address, CALLER_BTC_ADDRESS_MAINNET.to_string());
}

#[test]
fn test_caller_btc_address_testnet() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();
    let network = BitcoinNetwork::Testnet;

    let address = pic_setup
        .update::<String>(caller, "caller_btc_address", network)
        .expect("Failed to call testnet btc address.");

    assert_eq!(address, CALLER_BTC_ADDRESS_TESTNET.to_string());
}

#[test]
fn test_anonymous_cannot_call_btc_address() {
    let pic_setup = setup();
    let network = BitcoinNetwork::Testnet;

    let address = pic_setup.update::<String>(Principal::anonymous(), "caller_btc_address", network);

    assert!(address.is_err());
    assert_eq!(
        address.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_testnet_btc_address_is_same_as_regtest() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();
    let testnet = BitcoinNetwork::Testnet;
    let regtest = BitcoinNetwork::Regtest;

    let address_testnet = pic_setup
        .update::<String>(caller, "caller_btc_address", testnet)
        .expect("Failed to call testnet btc address.");

    let address_regtest = pic_setup
        .update::<String>(caller, "caller_btc_address", regtest)
        .expect("Failed to call regtest btc address.");

    assert_eq!(address_testnet, address_regtest);
}
