//! `PocketIc` integration tests for the public `/status` HTTP endpoint.
//!
//! The endpoint is wired through the `http_request` query in
//! `src/backend/src/api/admin.rs` and routes to the `status` module. It is intentionally
//! unauthenticated and exposes only coarse-grained statuses (no counts).

use std::time::Duration;

use candid::Principal;
use pretty_assertions::assert_eq;
use serde_bytes::ByteBuf;
use serde_json::Value;
use shared::{
    http::{HttpRequest, HttpResponse},
    types::{
        network::{SetShowTestnetsRequest, SetTestnetsSettingsError},
        user_profile::{CreateUserProfileError, UserProfile},
    },
};

use crate::utils::pocketic::{BackendBuilder, PicCanisterTrait};

/// Mirror of `crate::status::cache::CACHE_TTL_NS` (60s). Hardcoded here to keep this test crate
/// independent of the canister-internal module.
const CACHE_TTL_SECS: u64 = 60;

/// Mirror of `crate::status::metrics::SIGNUPS_WARN_THRESHOLD`. Kept as `usize` to match the
/// canister-side type; narrowed to `u8` at the call site below since `create_users` takes a
/// `RangeBounds<u8>`. The `try_from` will trip if the threshold is ever bumped past `u8::MAX`,
/// which is exactly the signal we want to retune this test rather than silently truncate.
const SIGNUPS_WARN_THRESHOLD: usize = 50;

fn signups_warn_threshold_u8() -> u8 {
    u8::try_from(SIGNUPS_WARN_THRESHOLD)
        .expect("SIGNUPS_WARN_THRESHOLD must fit into u8 for create_users")
}

fn make_request(url: &str) -> HttpRequest {
    HttpRequest {
        method: "GET".to_string(),
        url: url.to_string(),
        headers: vec![],
        body: ByteBuf::from(Vec::<u8>::new()),
    }
}

fn fetch_status<P: PicCanisterTrait>(pic_setup: &P) -> (HttpResponse, Value) {
    let response: HttpResponse = pic_setup
        .query(
            Principal::anonymous(),
            "http_request",
            make_request("/status"),
        )
        .expect("/status should always return Ok");
    let body: Value =
        serde_json::from_slice(response.body.as_ref()).expect("response body must be JSON");
    (response, body)
}

#[test]
fn status_endpoint_returns_ok_on_empty_canister() {
    let pic_setup = BackendBuilder::default().deploy();

    let (response, body) = fetch_status(&pic_setup);

    assert_eq!(response.status_code, 200);
    let content_type = response
        .headers
        .iter()
        .find(|(k, _)| k.eq_ignore_ascii_case("Content-Type"))
        .map(|(_, v)| v.as_str());
    assert_eq!(content_type, Some("application/json"));

    assert_eq!(body["status"], Value::String("ok".to_string()));
    assert_eq!(body["version"], Value::from(1));
    assert_eq!(
        body["metrics"]["signups_30m"]["status"],
        Value::String("ok".to_string()),
        "body was: {body}"
    );
}

#[test]
fn status_endpoint_does_not_leak_counts_or_messages() {
    let pic_setup = BackendBuilder::default().deploy();

    // Even after creating some users, the public payload must never include numeric counts or
    // free-form messages: only coarse-grained statuses.
    let _ = pic_setup.create_users(1..=5);

    // Advance past the cache TTL so the response reflects the new state, not the empty boot.
    pic_setup
        .pic()
        .advance_time(Duration::from_secs(CACHE_TTL_SECS + 1));

    let (_, body) = fetch_status(&pic_setup);
    let raw = body.to_string();

    assert!(
        !raw.contains("count"),
        "payload must not embed any 'count' field: {raw}"
    );
    assert!(
        !raw.contains("message"),
        "payload must not embed any 'message' field: {raw}"
    );

    let entry = &body["metrics"]["signups_30m"];
    let keys: Vec<&str> = entry
        .as_object()
        .expect("metric entry must be an object")
        .keys()
        .map(String::as_str)
        .collect();
    assert_eq!(
        keys,
        vec!["status"],
        "signups_30m metric must only expose `status`"
    );
}

#[test]
fn status_endpoint_flips_to_warn_when_signups_exceed_threshold() {
    let pic_setup = BackendBuilder::default().deploy();

    // Sanity: empty canister is `ok`.
    let (_, body) = fetch_status(&pic_setup);
    assert_eq!(body["metrics"]["signups_30m"]["status"], "ok");

    // Cross the warn threshold. `create_users` advances pocket-ic time by 10s per user, so
    // creating WARN users moves time forward by ~500s — well past the 60s cache TTL, naturally
    // invalidating the previous cached response.
    let _ = pic_setup.create_users(1..=signups_warn_threshold_u8());

    let (_, body) = fetch_status(&pic_setup);
    assert_eq!(
        body["metrics"]["signups_30m"]["status"],
        Value::String("warn".to_string()),
        "expected warn after >= {SIGNUPS_WARN_THRESHOLD} signups, body: {body}"
    );
    assert_eq!(
        body["status"],
        Value::String("warn".to_string()),
        "top-level rollup must reflect the worst child: {body}"
    );
}

#[test]
fn status_endpoint_caches_within_ttl() {
    let pic_setup = BackendBuilder::default().deploy();

    let (_, first) = fetch_status(&pic_setup);
    let first_ts = first["timestamp_ns"]
        .as_u64()
        .expect("timestamp_ns must be a u64");

    // Repeated calls within the TTL window must return the cached payload — same timestamp,
    // same status. We avoid `advance_time` here so we stay strictly inside the 60s TTL.
    for _ in 0..3 {
        let (_, again) = fetch_status(&pic_setup);
        assert_eq!(
            again["timestamp_ns"].as_u64().unwrap(),
            first_ts,
            "cached response must keep the same timestamp within TTL"
        );
        assert_eq!(again["status"], first["status"]);
    }

    // Past the TTL, the canister must recompute and return a fresh timestamp. `advance_time`
    // alone is not enough on PocketIC: a `tick` is needed for the new time to become visible to
    // subsequent canister calls.
    pic_setup
        .pic()
        .advance_time(Duration::from_secs(CACHE_TTL_SECS + 1));
    pic_setup.pic().tick();

    let (_, refreshed) = fetch_status(&pic_setup);
    let refreshed_ts = refreshed["timestamp_ns"]
        .as_u64()
        .expect("timestamp_ns must be a u64");
    assert!(
        refreshed_ts > first_ts,
        "after TTL expiry, response timestamp must advance (first={first_ts}, refreshed={refreshed_ts})"
    );
}

/// Regression test for the `count_signups_in_window` rewrite.
///
/// The metric must count profiles by `created_timestamp`, not by `updated_timestamp`. The
/// underlying `user_profile` map is keyed by `(updated_timestamp, principal)`, so a profile that
/// was created long ago but recently updated lives in the same "tail" as fresh signups; the
/// post-filter must still exclude it.
#[test]
fn status_does_not_count_old_profiles_with_recent_updates() {
    let pic_setup = BackendBuilder::default().deploy();
    let caller = Principal::self_authenticating("status-old-profile-recent-update");

    // Sign up: `created_timestamp` and `updated_timestamp` both equal "now".
    let create_response = pic_setup.update::<Result<UserProfile, CreateUserProfileError>>(
        caller,
        "create_user_profile",
        (),
    );
    let profile = create_response
        .expect("create_user_profile call must succeed")
        .expect("signups must be open on a fresh canister");

    // Age the profile out of the signups window, then bump `updated_timestamp` by toggling a
    // setting. After this the profile satisfies `updated_timestamp >= cutoff` (so it lies in the
    // suffix scanned by `range`) but `created_timestamp < cutoff` (so it must be filtered out).
    pic_setup.pic().advance_time(Duration::from_mins(31));
    pic_setup.pic().tick();

    let toggle_response = pic_setup.update::<Result<(), SetTestnetsSettingsError>>(
        caller,
        "set_user_show_testnets",
        SetShowTestnetsRequest {
            show_testnets: true,
            current_user_version: profile.version,
        },
    );
    assert_eq!(
        toggle_response,
        Ok(Ok(())),
        "toggling testnets must succeed so updated_timestamp is bumped"
    );

    // Bypass the cached response from canister boot.
    pic_setup
        .pic()
        .advance_time(Duration::from_secs(CACHE_TTL_SECS + 1));
    pic_setup.pic().tick();

    let (_, body) = fetch_status(&pic_setup);
    assert_eq!(
        body["metrics"]["signups_30m"]["status"],
        Value::String("ok".to_string()),
        "profile created >30min ago must not count as a recent signup even after a fresh update: {body}"
    );
    assert_eq!(
        body["status"],
        Value::String("ok".to_string()),
        "top-level status must roll up to ok: {body}"
    );
}

#[test]
fn status_endpoint_returns_404_for_unknown_path() {
    let pic_setup = BackendBuilder::default().deploy();

    let response: HttpResponse = pic_setup
        .query(
            Principal::anonymous(),
            "http_request",
            make_request("/does-not-exist"),
        )
        .expect("http_request must always succeed at the canister boundary");
    assert_eq!(response.status_code, 404);
}
