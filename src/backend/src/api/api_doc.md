# OISY backend API guide

This canister provides backend services for the OISY wallet application. Its
Candid interface describes the available methods and their exact argument,
return, and error types. Use that interface together with this guide; this text
is descriptive and may not include every method.

## Identity and authorization

Calls run as the caller principal supplied by the Internet Computer agent.
Personal data and wallet-related records are generally scoped to that caller;
never assume that a method can read or change another user's data. Some methods
require a non-anonymous caller or an existing OISY user profile. Configuration
and administrative methods are restricted to canister controllers and, for some
read-only ones, configured allowed callers. Check the method comments and result
variants in Candid before calling an endpoint.

`has_user_profile` and `new_user_signups_allowed` are read-only queries that
can help determine whether a caller needs to create a profile. Profile creation
and user preference methods may update OISY-managed state; they do not create an
Internet Identity identity or control the caller's signing keys.

## Terms of Use

Using OISY, including through an agent, is subject to the OISY Terms of Use:
https://oisy.com/terms-of-use/

Before creating a profile for a user, show them the Terms of Use and ask whether
they accept. If they decline, do not call `create_user_profile`. If they accept,
call `create_user_profile`, then `update_user_agreements` with
`current_user_version` set to the profile's `version`, and `accepted = opt true`
with the values below for each agreement, as the OISY web app records on sign-in.
Leave `last_accepted_at_ns` empty; the backend sets it.

| Agreement           | `last_updated_at_ms` | `text_sha256`                                                      |
| ------------------- | -------------------- | ------------------------------------------------------------------ |
| `terms_of_use`      | `1756245600000`      | `52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930` |
| `license_agreement` | `1756245600000`      | `248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979` |
| `privacy_policy`    | `1756245600000`      | `3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424` |

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
general authorization or transaction-signing methods. The tip methods move
tokens only within their own flow: `create_tip` records a tip against an ICRC-2
allowance the tipper has already granted to this canister, and `claim_tip` pays
it out to the claimer once, from that allowance. Use the relevant wallet flow
and its explicit user approval for any asset movement.

## Calling guidance

- Prefer query methods for reads when the interface marks them `query`. Query
  responses come from a single replica and are not certified, so when a read
  decides something about funds or keys, call that query method as an update
  (replicated) call instead, so that the response goes through consensus. The
  OISY frontend does this for `get_tip_secret` and
  `btc_get_current_fee_percentiles`. Methods not marked `query` are always
  update calls.
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
