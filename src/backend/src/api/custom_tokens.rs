use ic_cdk::{api::msg_caller, update};
use shared::types::custom_token::{CustomToken, CustomTokenId};

use crate::{
    state::{mutate_state, read_state},
    token::{self, MAX_TOKEN_LIST_LENGTH},
    types::StoredPrincipal,
    utils::guards::caller_is_not_anonymous,
};

/// Add or update custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
pub fn set_custom_token(token: CustomToken) {
    let stored_principal = StoredPrincipal(msg_caller());

    mutate_state(|s| {
        token::add_to_user_token(
            stored_principal,
            &mut s.custom_token,
            std::slice::from_ref(&token),
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    let CustomToken { token, .. } = token;

    token::mark_token_active(&CustomTokenId::from(&token));
}

#[update(guard = "caller_is_not_anonymous")]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    let tokens = tokens.into_boxed_slice();

    if tokens.len() > MAX_TOKEN_LIST_LENGTH {
        ic_cdk::trap(format!(
            "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
        ));
    }

    let stored_principal = StoredPrincipal(msg_caller());

    let ids = tokens
        .iter()
        .map(|t| CustomTokenId::from(&t.token))
        .collect::<Vec<_>>();

    mutate_state(|s| {
        token::add_to_user_token(
            stored_principal,
            &mut s.custom_token,
            &tokens,
            |t: &CustomToken| CustomTokenId::from(&t.token),
        );
    });

    token::mark_tokens_active(&ids);
}

/// Remove custom token for the user.
#[update(guard = "caller_is_not_anonymous")]
pub fn remove_custom_token(token: CustomToken) {
    let CustomToken { token, .. } = token;

    let stored_principal = StoredPrincipal(msg_caller());

    mutate_state(|s| {
        let find = |t: &CustomToken| -> bool {
            CustomTokenId::from(&t.token) == CustomTokenId::from(&token)
        };

        token::remove_from_user_token(stored_principal, &mut s.custom_token, &find);
    });
}

/// List the custom tokens for the calling user.
///
/// Note: This method was previously exposed as a *query* but is now an *update*
/// call. The change is intentional and breaking: `list_custom_tokens` now tracks
/// token activity by calling `mark_tokens_active`, which mutates canister state.
/// Because queries must not modify state on the IC, this function must be an
/// update, not a query.
///
/// Implications for callers:
/// - This call now participates in consensus and may have higher latency than a query.
/// - It consumes cycles as an update call.
/// - Integrations that previously relied on query semantics must be updated to invoke this as an
///   update method.
#[update(guard = "caller_is_not_anonymous")]
#[must_use]
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(msg_caller());

    let tokens = read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0);

    if !tokens.is_empty() {
        let ids: Vec<CustomTokenId> = tokens
            .iter()
            .map(|t| CustomTokenId::from(&t.token))
            .collect();

        token::mark_tokens_active(&ids);
    }

    tokens
}
