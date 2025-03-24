use shared::types::{custom_token::CustomToken, user_profile::OisyUser};

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

pub fn assert_user_profiles_eq(results_users: Vec<OisyUser>, expected_users: Vec<OisyUser>) {
    assert_eq!(results_users.len(), expected_users.len(),);

    for (user, expected) in results_users.iter().zip(expected_users.iter()) {
        assert_eq!(
            user, expected,
            "Result users differs from expected user: {user:?} vs {expected:?}"
        );
    }
}
