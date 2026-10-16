use ic_cdk::query;

/// Returns usage guidance for AI agents and other API clients.
///
/// The Candid interface remains the source of truth for method signatures and
/// exact error variants.
#[query]
pub fn get_api_doc() -> String {
    r#"# OISY backend API guide

This canister provides backend services for the OISY wallet application. Its
Candid interface describes the available methods and their exact argument,
return, and error types. Use that interface together with this guide; this text
is descriptive and may not include every method.

## Identity and authorization

Calls run as the caller principal supplied by the Internet Computer agent.
Personal data and wallet-related records are generally scoped to that caller;
never assume that a method can read or change another user's data. Some methods
require a non-anonymous caller or an existing OISY user profile. Controller
configuration methods are restricted to canister controllers. Check the method
comments and result variants in Candid before calling an endpoint.

`has_user_profile` and `new_user_signups_allowed` are read-only queries that
can help determine whether a caller needs to create a profile. Profile creation
and user preference methods may update OISY-managed state; they do not create an
Internet Identity identity or control the caller's signing keys.

## What this API provides

The backend exposes OISY application services, including user preferences and
agreements, contacts, custom-token settings, transaction history and in-flight
transaction tracking, personal notes, tips, exchange-rate data, Bitcoin fee and
pending-transaction helpers, and selected provider or signing-flow helpers.
Use the Candid method list for the current endpoints and their exact behavior.

This is not a general-purpose wallet execution API. In particular, it does not
provide a generic method to transfer tokens or sign arbitrary transactions on
the caller's behalf. Methods such as `allow_signing` and
`sign_onramper_widget_url` serve specific OISY flows and must not be treated as
general authorization or transaction-signing methods. Use the relevant wallet
flow and its explicit user approval for any asset movement.

## Calling guidance

- Prefer query methods for reads when the interface marks them `query`.
- Update methods can mutate caller-scoped state, perform inter-canister calls,
  or incur update-call latency and cycles. Do not retry non-idempotent actions
  blindly; inspect the method's documented idempotency and result first.
- A returned `Err` is an application-level result described by the Candid
  variant. Handle it explicitly; a successful canister call does not mean the
  operation itself returned `Ok`.
- Treat encrypted note and tip-secret values as opaque ciphertext. The canister
  cannot use them as plaintext user data.
- Do not call controller-only configuration or administrative methods as an
  end user.
"#
    .to_string()
}

#[cfg(test)]
mod tests {
    use super::get_api_doc;

    #[test]
    fn api_doc_describes_scope_and_transaction_limits() {
        let doc = get_api_doc();
        assert!(doc.contains("caller principal"));
        assert!(doc.contains("does not\nprovide a generic method to transfer tokens"));
        assert!(doc.contains("Candid interface"));
    }
}
