use shared::types::custom_token::CustomToken;

pub fn assert_tokens_data_eq<T: PartialEq + std::fmt::Debug>(
    results_tokens: &[T],
    expected_tokens: &[T],
) {
    assert_eq!(
        results_tokens.len(),
        expected_tokens.len(),
        "The number of tokens differ."
    );

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert_eq!(
            token, expected,
            "Result token differs from expected token: {token:?} vs {expected:?}"
        );
    }
}

pub fn assert_custom_tokens_eq(
    results_tokens: Vec<CustomToken>,
    expected_tokens: Vec<CustomToken>,
) {
    assert_eq!(
        results_tokens.len(),
        expected_tokens.len(),
        "The number of custom tokens differ."
    );

    for (token, expected) in results_tokens.iter().zip(expected_tokens.iter()) {
        assert_eq!(
            token, expected,
            "Result custom token differs from expected custom token: {token:?} vs {expected:?}"
        );
    }
}
