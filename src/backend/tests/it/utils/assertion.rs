use shared::types::custom_token::CustomToken;
use shared::types::token::UserToken;
use shared::types::TokenVersion;

pub fn assert_tokens_data_eq(results_tokens: &[UserToken], expected_tokens: &[UserToken]) {
    assert_eq!(
        results_tokens.len(),
        expected_tokens.len(),
        "The number of tokens differ."
    );

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert_eq!(
            token, expected,
            "Result token differs from expected token: {:?} vs {:?}",
            token, expected
        );
    }
}

/// Compares two slices of `UserToken` to ensure they are equal in terms of specific fields:
/// `contract_address`, `chain_id`, `symbol`, and `decimals`.
///
/// This function does not compare the `version` field of the tokens.
pub fn assert_custom_tokens_eq(
    results_tokens: Vec<CustomToken>,
    expected_tokens: Vec<CustomToken>,
) {
    assert_eq!(results_tokens.len(), expected_tokens.len());

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert!(expected.token == token.token);
        assert_eq!(expected.enabled, token.enabled);
    }
}

pub fn assert_some_tokens_version<T>(tokens: &[T])
where
    T: TokenVersion,
{
    for token in tokens.iter() {
        assert!(
            token.get_version().is_some(),
            "Token has no version: {:?}",
            token
        );
    }
}

pub fn assert_none_tokens_version<T>(tokens: Vec<T>)
where
    T: TokenVersion,
{
    for token in tokens.iter() {
        assert!(
            token.get_version().is_none(),
            "Custom token has no version: {:?}",
            token
        );
    }
}
