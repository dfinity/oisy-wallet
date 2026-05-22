use ic_cdk::{api::msg_caller, update};
use shared::types::{
    custom_token::{CustomToken, CustomTokenId},
    token_id::TokenId,
};

use crate::{
    state::{mutate_state, read_state},
    token::{self, MAX_TOKEN_LIST_LENGTH},
    types::StoredPrincipal,
    utils::guards::caller_is_registered_user,
};

/// Maximum number of entries allowed in
/// [`CustomToken::allowed_external_content_source_urls`].
///
/// These are user-consented origins/URLs for fetching external NFT media; even
/// large collections only have a handful of distinct providers, so a small cap
/// is sufficient and keeps stable memory usage bounded.
pub const MAX_ALLOWED_EXTERNAL_CONTENT_SOURCE_URLS: usize = 20;

/// Maximum byte length of any single entry in
/// [`CustomToken::allowed_external_content_source_urls`].
///
/// Aligns with the widely-used 2048-byte URL limit; longer values almost
/// certainly indicate malformed or abusive input.
pub const MAX_ALLOWED_EXTERNAL_CONTENT_SOURCE_URL_LENGTH: usize = 2048;

/// Validates the user-controlled
/// [`CustomToken::allowed_external_content_source_urls`] field before
/// persisting it, to prevent unbounded growth of stable memory and cycle
/// costs on `set_custom_token` / `set_many_custom_tokens`.
fn validate_allowed_external_content_source_urls(token: &CustomToken) {
    let Some(urls) = token.allowed_external_content_source_urls.as_ref() else {
        return;
    };

    if urls.len() > MAX_ALLOWED_EXTERNAL_CONTENT_SOURCE_URLS {
        ic_cdk::trap(format!(
            "allowed_external_content_source_urls length should not exceed {MAX_ALLOWED_EXTERNAL_CONTENT_SOURCE_URLS}"
        ));
    }

    if urls
        .iter()
        .any(|url| url.len() > MAX_ALLOWED_EXTERNAL_CONTENT_SOURCE_URL_LENGTH)
    {
        ic_cdk::trap(format!(
            "allowed_external_content_source_urls entry length should not exceed {MAX_ALLOWED_EXTERNAL_CONTENT_SOURCE_URL_LENGTH}"
        ));
    }
}

/// Add or update custom token for the user.
#[update(guard = "caller_is_registered_user")]
pub fn set_custom_token(token: CustomToken) {
    validate_allowed_external_content_source_urls(&token);

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

    token::mark_token_active(&TokenId::from(&token));
}

#[update(guard = "caller_is_registered_user")]
pub fn set_many_custom_tokens(tokens: Vec<CustomToken>) {
    let tokens = tokens.into_boxed_slice();

    if tokens.len() > MAX_TOKEN_LIST_LENGTH {
        ic_cdk::trap(format!(
            "Token list length should not exceed {MAX_TOKEN_LIST_LENGTH}"
        ));
    }

    for token in &tokens {
        validate_allowed_external_content_source_urls(token);
    }

    let stored_principal = StoredPrincipal(msg_caller());

    let ids: Vec<TokenId> = tokens.iter().map(|t| TokenId::from(&t.token)).collect();

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
#[update(guard = "caller_is_registered_user")]
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
#[update(guard = "caller_is_registered_user")]
#[must_use]
pub fn list_custom_tokens() -> Vec<CustomToken> {
    let stored_principal = StoredPrincipal(msg_caller());

    let tokens = read_state(|s| s.custom_token.get(&stored_principal).unwrap_or_default().0);

    if !tokens.is_empty() {
        let ids: Vec<TokenId> = tokens.iter().map(|t| TokenId::from(&t.token)).collect();

        token::mark_tokens_active(&ids);
    }

    tokens
}
