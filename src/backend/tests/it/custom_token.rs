use std::sync::LazyLock;

use candid::Principal;
use shared::types::{
    custom_token::{
        ChainId, CustomToken, ErcToken, ErcTokenId, IcrcToken, SplToken, SplTokenId, Token,
    },
    TokenVersion,
};

use crate::utils::{
    assertion::{assert_custom_tokens_eq, assert_tokens_data_eq},
    mock::CALLER,
    pocketic::{setup, PicCanisterTrait},
};

static ICRC_TOKEN: LazyLock<IcrcToken> = LazyLock::new(|| IcrcToken {
    ledger_id: Principal::from_text("ddsp7-7iaaa-aaaaq-aacqq-cai").unwrap(),
    index_id: Some(Principal::from_text("dnqcx-eyaaa-aaaaq-aacrq-cai").unwrap()),
});
static USER_TOKEN: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::Icrc(ICRC_TOKEN.clone()),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static ANOTHER_USER_TOKEN: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::Icrc(IcrcToken {
        ledger_id: Principal::from_text("uf2wh-taaaa-aaaaq-aabna-cai").unwrap(),
        index_id: Some(Principal::from_text("ux4b6-7qaaa-aaaaq-aaboa-cai").unwrap()),
    }),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static USER_TOKEN_NO_INDEX: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::Icrc(IcrcToken {
        ledger_id: Principal::from_text("ddsp7-7iaaa-aaaaq-aacqq-cai").unwrap(),
        index_id: None,
    }),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static SPL_TOKEN_ID: LazyLock<SplTokenId> =
    LazyLock::new(|| SplTokenId("AQoKYV7tYpTrFZN6P5oUufbQKAUr9mNYGe1TTJC9wajM".to_string()));
static SPL_TOKEN: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::SplMainnet(SplToken {
        token_address: SPL_TOKEN_ID.clone(),
        symbol: Some("BOOONDOGGLE".to_string()),
        decimals: Some(u8::MAX),
    }),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static ERC20_TOKEN_ID: LazyLock<ErcTokenId> =
    LazyLock::new(|| ErcTokenId("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913".to_string()));
static ERC20_CHAIN_ID: LazyLock<ChainId> = LazyLock::new(|| 8453);
static ERC20_TOKEN: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::Erc20(ErcToken {
        token_address: ERC20_TOKEN_ID.clone(),
        chain_id: ERC20_CHAIN_ID.clone(),
    }),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static ERC721_TOKEN_ID: LazyLock<ErcTokenId> =
    LazyLock::new(|| ErcTokenId("0x8821bee2ba0df28761afff119d66390d594cd280".to_string()));
static ERC721_CHAIN_ID: LazyLock<ChainId> = LazyLock::new(|| 137);
static ERC721_TOKEN: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::Erc721(ErcToken {
        token_address: ERC721_TOKEN_ID.clone(),
        chain_id: ERC721_CHAIN_ID.clone(),
    }),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static ERC1155_TOKEN_ID: LazyLock<ErcTokenId> =
    LazyLock::new(|| ErcTokenId("0x6a00bfd7f89204721aaf9aec39592cf444bff845".to_string()));
static ERC1155_CHAIN_ID: LazyLock<ChainId> = LazyLock::new(|| 42161);
static ERC1155_TOKEN: LazyLock<CustomToken> = LazyLock::new(|| CustomToken {
    token: Token::Erc1155(ErcToken {
        token_address: ERC1155_TOKEN_ID.clone(),
        chain_id: ERC1155_CHAIN_ID.clone(),
    }),
    enabled: true,
    version: None,
    section: None,
    allow_media_source: None,
});
static LOTS_OF_CUSTOM_TOKENS: LazyLock<Vec<CustomToken>> = LazyLock::new(|| {
    vec![
        USER_TOKEN.clone(),
        ANOTHER_USER_TOKEN.clone(),
        SPL_TOKEN.clone(),
        ERC20_TOKEN.clone(),
        ERC721_TOKEN.clone(),
        ERC1155_TOKEN.clone(),
    ]
});

#[test]
fn test_add_custom_tokens() {
    for token in LOTS_OF_CUSTOM_TOKENS.iter() {
        test_add_custom_token(token);
    }
}

fn test_add_custom_token(user_token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let before_set = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    assert_eq!(before_set, Ok(Vec::new()));

    let result = pic_setup.update::<()>(caller, "set_custom_token", user_token.clone());

    assert_eq!(result, Ok(()));

    let after_set = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![user_token.with_incremented_version()];
    assert_tokens_data_eq(&after_set.unwrap(), &expected_tokens);
}

#[test]
fn test_remove_custom_spl_token() {
    test_remove_custom_token(&SPL_TOKEN)
}

#[test]
fn test_remove_custom_erc20_token() {
    test_remove_custom_token(&ERC20_TOKEN)
}

#[test]
fn test_remove_custom_erc721_token() {
    test_remove_custom_token(&ERC721_TOKEN)
}

#[test]
fn test_remove_custom_erc1155_token() {
    test_remove_custom_token(&ERC1155_TOKEN)
}

#[test]
fn test_remove_custom_icrc_token() {
    test_remove_custom_token(&USER_TOKEN)
}

#[test]
fn test_remove_custom_no_index_token() {
    test_remove_custom_token(&USER_TOKEN_NO_INDEX)
}

fn test_remove_custom_token(token: &CustomToken) {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let before_set = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    assert_eq!(before_set, Ok(Vec::new()));

    let result = pic_setup.update::<()>(caller, "set_custom_token", token.clone());

    assert_eq!(result, Ok(()));

    let before_remove = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![token.with_incremented_version()];
    assert_tokens_data_eq(&before_remove.unwrap(), &expected_tokens);

    let result = pic_setup.update::<()>(caller, "remove_custom_token", token.clone());

    assert_eq!(result, Ok(()));

    let after_remove = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    assert_eq!(after_remove, Ok(Vec::new()));
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

    let result = pic_setup.update::<()>(caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let results = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![user_token.with_incremented_version()];

    assert!(results.is_ok());

    assert_custom_tokens_eq(results.clone().unwrap(), expected_tokens);

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: results.unwrap().first().unwrap().version,
        section: user_token.section.clone(),
        allow_media_source: user_token.allow_media_source.clone(),
    };

    let update_result = pic_setup.update::<()>(caller, "set_custom_token", update_token.clone());

    assert!(update_result.is_ok());

    let updated_results = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    let expected_updated_tokens: Vec<CustomToken> = vec![update_token.with_incremented_version()];

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

    let before_set = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    assert!(before_set.is_ok());
    assert_eq!(before_set.unwrap().len(), 0);

    let tokens: Vec<CustomToken> = vec![user_token.clone(), ANOTHER_USER_TOKEN.clone()];

    let result = pic_setup.update::<()>(caller, "set_many_custom_tokens", tokens);

    assert!(result.is_ok());

    let after_set = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![
        user_token.with_incremented_version(),
        ANOTHER_USER_TOKEN.with_incremented_version(),
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

    let result = pic_setup.update::<()>(caller, "set_many_custom_tokens", tokens.clone());

    assert!(result.is_ok());

    let results = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    assert!(results.is_ok());

    let expected_tokens: Vec<CustomToken> = vec![
        user_token.with_incremented_version(),
        ANOTHER_USER_TOKEN.with_incremented_version(),
    ];

    assert_custom_tokens_eq(results.clone().unwrap(), expected_tokens);

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: results.clone().unwrap().first().unwrap().version,
        section: user_token.section.clone(),
        allow_media_source: user_token.allow_media_source.clone(),
    };

    let update_another_token: CustomToken = CustomToken {
        enabled: false,
        token: ANOTHER_USER_TOKEN.token.clone(),
        version: results.unwrap().get(1).unwrap().version,
        section: user_token.section.clone(),
        allow_media_source: user_token.allow_media_source.clone(),
    };

    let update_tokens: Vec<CustomToken> = vec![update_token.clone(), update_another_token.clone()];

    let update_result =
        pic_setup.update::<()>(caller, "set_many_custom_tokens", update_tokens.clone());

    assert!(update_result.is_ok());

    let updated_results = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    assert!(updated_results.is_ok());

    let expected_update_tokens: Vec<CustomToken> = vec![
        update_token.with_incremented_version(),
        update_another_token.with_incremented_version(),
    ];

    let updated_tokens = updated_results.unwrap();

    assert_custom_tokens_eq(updated_tokens.clone(), expected_update_tokens);
}

#[test]
fn test_list_custom_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = pic_setup.update::<()>(caller, "set_custom_token", USER_TOKEN.clone());

    let _ = pic_setup.update::<()>(caller, "set_custom_token", ANOTHER_USER_TOKEN.clone());

    let results = pic_setup.query::<Vec<CustomToken>>(caller, "list_custom_tokens", ());

    let expected_tokens: Vec<CustomToken> = vec![
        USER_TOKEN.with_incremented_version(),
        ANOTHER_USER_TOKEN.with_incremented_version(),
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

    let result = pic_setup.update::<()>(caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: None,
        section: user_token.section.clone(),
        allow_media_source: user_token.allow_media_source.clone(),
    };

    let update_result = pic_setup.update::<()>(caller, "set_custom_token", update_token.clone());

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

    let result = pic_setup.update::<()>(caller, "set_custom_token", user_token.clone());

    assert!(result.is_ok());

    let update_token: CustomToken = CustomToken {
        enabled: false,
        token: user_token.token.clone(),
        version: Some(123456789),
        section: user_token.section.clone(),
        allow_media_source: user_token.allow_media_source.clone(),
    };

    let update_result = pic_setup.update::<()>(caller, "set_custom_token", update_token.clone());

    assert!(update_result.is_err());
    assert!(update_result
        .unwrap_err()
        .contains("Version mismatch, token update not allowed"));
}

#[test]
fn test_anonymous_cannot_add_custom_token() {
    let pic_setup = setup();

    let result = pic_setup.update::<()>(
        Principal::anonymous(),
        "set_custom_token",
        USER_TOKEN.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        result.unwrap_err(),
        "Update call error. RejectionCode: CanisterReject, Error: Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized.".to_string()
    );
}

#[test]
fn test_anonymous_cannot_list_custom_tokens() {
    let pic_setup = setup();

    let result = pic_setup.query::<()>(
        Principal::anonymous(),
        "list_custom_tokens",
        USER_TOKEN.clone(),
    );

    assert!(result.is_err());
    assert_eq!(
        &result.unwrap_err(),
        "Query call error. RejectionCode: CanisterReject, Error: Update call error. RejectionCode: CanisterReject, Error: Anonymous caller not authorized."
    );
}

#[test]
fn test_user_cannot_list_another_custom_tokens() {
    let pic_setup = setup();

    let caller = Principal::from_text(CALLER).unwrap();

    let _ = pic_setup.update::<()>(caller, "set_custom_token", USER_TOKEN.clone());

    let another_caller =
        Principal::from_text("yaa3n-twfur-6xz6e-3z7ep-xln56-222kz-w2b2m-y5wqz-vu6kk-s3fdg-lqe")
            .unwrap();

    let results = pic_setup.query::<Vec<CustomToken>>(another_caller, "list_custom_tokens", ());

    assert!(results.is_ok());

    let results_tokens = results.unwrap();

    assert_eq!(results_tokens.len(), 0);
}
