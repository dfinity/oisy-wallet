use crate::utils::mock::{CALLER, CALLER_ETH_ADDRESS, SEPOLIA_CHAIN_ID};
use crate::utils::pocketic::{setup, update_call};
use candid::{Nat, Principal};
use shared::types::SignRequest;

#[test]
fn test_sign_transaction() {
    let pic_setup = setup();

    let sign_request: SignRequest = SignRequest {
        chain_id: Nat::from(SEPOLIA_CHAIN_ID),
        to: CALLER_ETH_ADDRESS.to_string(),
        gas: Nat::from(123u64),
        max_fee_per_gas: Nat::from(456u64),
        max_priority_fee_per_gas: Nat::from(789u64),
        value: Nat::from(1u64),
        nonce: Nat::from(0u64),
        data: None,
    };

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let transaction = update_call::<String>(&pic_setup, caller, "sign_transaction", sign_request);

    assert_eq!(
        transaction.unwrap(),
        "0x02f86783aa36a7808203158201c87b94dd7fec4c49cd2dd4eaa884d22d92503eaba5a7910180c080a03591058f85526c5e20432e303c3244c6525c3bf8b212eb84179c10acce3adf61a008e46df594b856a80ed5f15a5dfd1631ca8be9609395f2a2f047f84622745243".to_string()
    );
}

#[test]
fn test_personal_sign() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let transaction = update_call::<String>(
        &pic_setup,
        caller,
        "personal_sign",
        hex::encode("test message".to_string()),
    );

    assert_eq!(
        transaction.unwrap(),
        "0x304e37956709f56327742df8cbb0533407aad95f18fc052c039ac9cee1eea30462d8b68aab6799a70fd9163827b521030679c3c6d7d6027b3c255e34e02695fc00".to_string()
    );
}

#[test]
fn test_cannot_personal_sign_if_message_is_not_hex_string() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<String>(
        &pic_setup,
        caller,
        "personal_sign",
        "test message".to_string(),
    );

    assert!(result.is_err());
    assert!(result.unwrap_err().contains("failed to decode hex"));
}

#[test]
fn test_cannot_sign_transaction_with_invalid_to_address() {
    let pic_setup = setup();

    let sign_request: SignRequest = SignRequest {
        chain_id: Nat::from(SEPOLIA_CHAIN_ID),
        to: "invalid_address".to_string(),
        gas: Nat::from(123u64),
        max_fee_per_gas: Nat::from(456u64),
        max_priority_fee_per_gas: Nat::from(789u64),
        value: Nat::from(1u64),
        nonce: Nat::from(0u64),
        data: None,
    };

    let caller = Principal::from_text(CALLER.to_string()).unwrap();

    let result = update_call::<String>(&pic_setup, caller, "sign_transaction", sign_request);

    assert!(result.is_err());
    assert!(result
        .unwrap_err()
        .contains("failed to parse the destination address"));
}

#[test]
fn test_anonymous_cannot_sign_transaction() {
    let pic_setup = setup();

    let result = update_call::<String>(&pic_setup, Principal::anonymous(), "sign_transaction", ());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_anonymous_cannot_personal_sign() {
    let pic_setup = setup();

    let result = update_call::<String>(&pic_setup, Principal::anonymous(), "personal_sign", ());

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}
