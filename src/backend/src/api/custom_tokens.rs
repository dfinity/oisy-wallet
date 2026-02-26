use ic_cdk::update;
use shared::types::custom_token::{CustomToken, CustomTokenId};

use crate::{
    guards::caller_is_not_anonymous,
    mutate_state, read_state,
    token::{add_to_user_token, mark_token_active, mark_tokens_active, remove_from_user_token, MAX_TOKEN_LIST_LENGTH},
    types::StoredPrincipal,
};

/// Add or update custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let find = |t: &CustomToken| -> bool {
        CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
    };

    mutate_state(|s| add_to_user_token(stored_principal, &mut s.custom_token, &token, &find));

    mark_token_active(&CustomTokenId::from(&token.token));
}

#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    if tokens.len() > MAX_TOKEN_LIST_LENGTH {
        ic_cdk::trap(&format!(
            "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
        ));
    }

    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let ids = tokens
        .iter()
        .map(|t| CustomTokenId::from(&t.token))
        .collect::<Vec<_>>();

    mutate_state(|s| {
        for token in tokens {
            let find = |t: &CustomToken| -> bool {
                CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
            };

            add_to_user_token(stored_principal, &mut s.custom_token, &token, &find);
        }
    });

    mark_tokens_active(&ids);
}

/// Remove custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
#[allow(clippy::needless_pass_by_value)]
pub fn remove_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    mutate_state(|s| {
        let find = |t: &CustomToken| -> bool {
            CustomTokenId::from(&t.token) == CustomTokenId::from(&token.token)
        };

        remove_from_user_token(stored_principal, &mut s.custom_token, &find);
    });
}

/// List the custom tokens for the calling user.
///
/// Note: This method was previously exposed as a *query* but is now an *update*
/// call. The change is intentional: `list_custom_tokens` now tracks token activity
/// by calling `mark_tokens_active`, which mutates canister state.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(ic_cdk::caller());

    let tokens = read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0);

    if !tokens.is_empty() {
        let ids: Vec<CustomTokenId> = tokens
            .iter()
            .map(|t| CustomTokenId::from(&t.token))
            .collect();

        mark_tokens_active(&ids);
    }

    tokens
}
