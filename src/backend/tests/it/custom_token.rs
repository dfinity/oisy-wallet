use crate::utils::assertion::{assert_custom_tokens_eq, assert_tokens_data_eq};
use crate::utils::mock::CALLER;
use crate::utils::pocketic::{query_call, setup, update_call};
use candid::Principal;
use lazy_static::lazy_static;
use shared::types::custom_token::{CustomToken, CustomTokenId, IcrcToken, Token};
use shared::types::TokenVersion;

lazy_static! {
    static ref ICRC_TOKEN: IcrcToken = IcrcToken {
        ledger_id: Principal::from_text("ddsp7-7iaaa-aaaaq-aacqq-cai".to_string()).unwrap(),
        index_id: Some(Principal::from_text("dnqcx-eyaaa-aaaaq-aacrq-cai".to_string()).unwrap()),
    };
    static ref USER_TOKEN: CustomToken = CustomToken {
        token: Token::Icrc(ICRC_TOKEN.clone()),
        enabled: true,
        version: None,
    };
    static ref USER_TOKEN_ID: CustomTokenId = CustomTokenId::Icrc(ICRC_TOKEN.ledger_id.clone());
    static ref ANOTHER_USER_TOKEN: CustomToken = CustomToken {
        token: Token::Icrc(IcrcToken {
            ledger_id: Principal::from_text("uf2wh-taaaa-aaaaq-aabna-cai".to_string()).unwrap(),
            index_id: Some(
                Principal::from_text("ux4b6-7qaaa-aaaaq-aaboa-cai".to_string()).unwrap()
            ),
        }),
        enabled: true,
        version: None,
    };
    static ref USER_TOKEN_NO_INDEX: CustomToken = CustomToken {
        token: Token::Icrc(IcrcToken {
            ledger_id: Principal::from_text("ddsp7-7iaaa-aaaaq-aacqq-cai".to_string()).unwrap(),
            index_id: None,
        }),
        enabled: true,
        version: None,
    };
}

#[test]
fn test_add_custom_token_with_index() {
    test_add_custom_token(&USER_TOKEN)
}

#[test]
fn test_add_custom_token_without_index() {
    test_add_custom_token(&USER_TOKEN_NO_INDEX)
}

fn test_add_custom_token(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let before_set = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);

    let result = update_call::<()>(&pic_setup, caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let after_set = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![user_token.clone_with_incremented_version()];
    assert_tokens_data_eq(&after_set.unwrap(), &expected_tokens);
}

#[test]
fn test_update_custom_token_with_index() {
    test_update_custom_token(&USER_TOKEN);
}

#[test]
fn test_update_custom_token_without_index() {
    test_update_custom_token(&USER_TOKEN_NO_INDEX);
}

fn test_update_custom_token(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let results = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![user_token.clone_with_incremented_version()];

    assert!(results.is_ok());

    assert_custom_tokens_eq(results.clone().unwrap(), expected_tokens);

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: results.unwrap().get(0).unwrap().version,
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "set_custom_token", update_token.clone());

    assert!(update_result.is_ok());

    let updated_results =
        query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    let expected_updated_tokens: Vec<CustomToken> =
        vec![update_token.clone_with_incremented_version()];

    assert!(updated_results.is_ok());

    let updated_tokens = updated_results.unwrap();

    assert_custom_tokens_eq(updated_tokens.clone(), expected_updated_tokens);
}

#[test]
fn test_add_many_custom_tokens_with_index() {
    test_add_many_custom_tokens(&USER_TOKEN);
}

#[test]
fn test_add_many_custom_tokens_without_index() {
    test_add_many_custom_tokens(&USER_TOKEN_NO_INDEX);
}

fn test_add_many_custom_tokens(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let before_set = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);

    let tokens: Vec<CustomToken> = vec![user_token.clone(), ANOTHER_USER_TOKEN.clone()];

    let result = update_call::<()>(&pic_setup, caller, "set_many_custom_tokens", tokens);

    assert!(result.is_ok());

    let after_set = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![
        user_token.clone_with_incremented_version(),
        ANOTHER_USER_TOKEN.clone_with_incremented_version(),
    ];
    assert_tokens_data_eq(&after_set.unwrap(), &expected_tokens);
}

#[test]
fn test_update_many_custom_tokens_with_index() {
    test_update_many_custom_tokens(&USER_TOKEN);
}

#[test]
fn test_update_many_custom_tokens_without_index() {
    test_update_many_custom_tokens(&USER_TOKEN_NO_INDEX);
}

fn test_update_many_custom_tokens(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let tokens: Vec<CustomToken> = vec![user_token.clone(), ANOTHER_USER_TOKEN.clone()];

    let result = update_call::<()>(&pic_setup, caller, "set_many_custom_tokens", tokens.clone());

    assert!(result.is_ok());

    let results = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    assert!(results.is_ok());

    let expected_tokens: Vec<CustomToken> = vec![
        user_token.clone_with_incremented_version(),
        ANOTHER_USER_TOKEN.clone_with_incremented_version(),
    ];

    assert_custom_tokens_eq(results.clone().unwrap(), expected_tokens);

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: results.clone().unwrap().get(0).unwrap().version,
    };

    let update_another_token: CustomToken = CustomToken {
        enabled: false,
        token: ANOTHER_USER_TOKEN.token.clone(),
        version: results.unwrap().get(1).unwrap().version,
    };

    let update_tokens: Vec<CustomToken> = vec![update_token.clone(), update_another_token.clone()];

    let update_result = update_call::<()>(
        &pic_setup,
        caller,
        "set_many_custom_tokens",
        update_tokens.clone(),
    );

    assert!(update_result.is_ok());

    let updated_results =
        query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    assert!(updated_results.is_ok());

    let expected_update_tokens: Vec<CustomToken> = vec![
        update_token.clone_with_incremented_version(),
        update_another_token.clone_with_incremented_version(),
    ];

    let updated_tokens = updated_results.unwrap();

    assert_custom_tokens_eq(updated_tokens.clone(), expected_update_tokens);
}

#[test]
fn test_list_custom_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = update_call::<()>(&pic_setup, caller, "set_custom_token", USER_TOKEN.clone());

    let _ = update_call::<()>(
        &pic_setup,
        caller,
        "set_custom_token",
        ANOTHER_USER_TOKEN.clone(),
    );

    let results = query_call::<Vec<CustomToken>>(&pic_setup, caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![
        USER_TOKEN.clone_with_incremented_version(),
        ANOTHER_USER_TOKEN.clone_with_incremented_version(),
    ];

    assert!(results.is_ok());

    let list_tokens = results.unwrap();

    assert_custom_tokens_eq(list_tokens.clone(), expected_tokens);
}

#[test]
fn test_cannot_update_custom_token_without_version_with_index() {
    test_cannot_update_custom_token_without_version(&USER_TOKEN);
}

#[test]
fn test_cannot_update_custom_token_without_version_without_index() {
    test_cannot_update_custom_token_without_version(&USER_TOKEN_NO_INDEX);
}

fn test_cannot_update_custom_token_without_version(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: None,
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "set_custom_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_cannot_update_custom_token_with_invalid_version_with_index() {
    test_cannot_update_custom_token_with_invalid_version(&USER_TOKEN);
}

#[test]
fn test_cannot_update_custom_token_with_invalid_version_without_index() {
    test_cannot_update_custom_token_with_invalid_version(&USER_TOKEN_NO_INDEX);
}

fn test_cannot_update_custom_token_with_invalid_version(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let result = update_call::<()>(&pic_setup, caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: Some(123456789),
    };

    let update_result =
        update_call::<()>(&pic_setup, caller, "set_custom_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_anonymous_cannot_add_custom_token() {
    let pic_setup = setup();

    let result = update_call::<()>(
        &pic_setup,
        Principal::anonymous(),
        "set_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_anonymous_cannot_list_custom_tokens() {
    let pic_setup = setup();

    let result = query_call::<()>(
        &pic_setup,
        Principal::anonymous(),
        "list_custom_tokens",
        USER_TOKEN.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_user_cannot_list_another_custom_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = update_call::<()>(&pic_setup, caller, "set_custom_token", USER_TOKEN.clone());

    let another_caller =
        Principal::from_text("yaa3n-twfur-6xz6e-3z7ep-xln56-222kz-w2b2m-y5wqz-vu6kk-s3fdg-lqe")
            .unwrap();

    let results =
        query_call::<Vec<CustomToken>>(&pic_setup, another_caller, "list_custom_tokens", ());

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), 0);
}
