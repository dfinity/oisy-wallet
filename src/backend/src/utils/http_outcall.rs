use candid::Nat;
use ic_cdk::{
    api::time,
    management_canister::{
        http_request, transform_context_from_query, HttpHeader, HttpMethod, HttpRequestArgs,
        HttpRequestResult, TransformArgs,
    },
    query,
};
use shared::types::exchange_cost::ExchangeOutcallRecord;

use crate::exchange::cost_log;

const USER_AGENT: &str = "OisyWalletBackend";

// --- IC HTTPS-outcall pricing constants ------------------------------------
//
// Source: <https://internetcomputer.org/docs/building-apps/essentials/gas-cost>
// (Application subnets, replication factor 13, last verified 2026-05).
//
// We compute outcall cost from these constants **deterministically** rather
// than reading `canister_cycle_balance()` around the `await`. The balance
// approach is polluted by concurrent fan-out: the exchange refresh issues
// many outcalls in parallel via `join_all`, so each measurement also
// captures its siblings' charges. The formula is exact per call and
// composes correctly to a total.
//
// If IC pricing changes, update the four constants below and the
// `last verified` date.

/// Replication factor of an IC application subnet. Used as the `n` multiplier
/// in every term of the HTTPS-outcall fee.
const SUBNET_REPLICATION_FACTOR: u128 = 13;
const HTTP_REQUEST_LINEAR_BASELINE_FEE: u128 = 3_000_000;
const HTTP_REQUEST_QUADRATIC_BASELINE_FEE: u128 = 60_000;
const HTTP_REQUEST_PER_BYTE_FEE: u128 = 400;
const HTTP_RESPONSE_PER_BYTE_FEE: u128 = 800;

/// Returns the deterministic IC cycle cost of one HTTPS outcall on a
/// 13-node application subnet.
///
/// `request_bytes` is the serialised size of URL + headers + body sent
/// to the management canister. `max_response_bytes` is the upfront
/// reservation; `actual_response_bytes` is what came back (or `0` for a
/// transport failure, in which case no response refund is applied —
/// upfront still includes the response reservation).
///
/// Net cost = `base + n × per_req_byte × request_bytes
///                  + n × per_resp_byte × max(actual, refund_floor)`.
///
/// On success the unused portion of `max_response_bytes` is refunded by
/// the management canister, so we use `actual_response_bytes`. On
/// transport failure we have no response, so charge for
/// `max_response_bytes` (the conservative upper bound).
pub(crate) fn outcall_cost_cycles(
    request_bytes: u64,
    max_response_bytes: u64,
    actual_response_bytes: u64,
    transport_succeeded: bool,
) -> u128 {
    let n = SUBNET_REPLICATION_FACTOR;
    let base = (HTTP_REQUEST_LINEAR_BASELINE_FEE + HTTP_REQUEST_QUADRATIC_BASELINE_FEE * n) * n;
    let req = HTTP_REQUEST_PER_BYTE_FEE * n * u128::from(request_bytes);
    let response_bytes_for_cost = if transport_succeeded {
        actual_response_bytes.min(max_response_bytes)
    } else {
        max_response_bytes
    };
    let resp = HTTP_RESPONSE_PER_BYTE_FEE * n * u128::from(response_bytes_for_cost);
    base + req + resp
}

/// Sum of the byte sizes of `url + headers (names and values) + body` for
/// a request the canister will send. Approximates the
/// `request_bytes` parameter the IC charges on. Excludes Candid framing
/// overhead, so this is a tight lower bound — close enough for cost
/// attribution (request bytes are a minor term anyway).
fn request_size_bytes(url: &str, headers: &[HttpHeader], body: Option<&[u8]>) -> u64 {
    let mut total: u64 = url.len() as u64;
    // build_request always prepends a User-Agent header before the caller's
    // headers; include it so the size matches what we actually send.
    total += "User-Agent".len() as u64 + USER_AGENT.len() as u64;
    for h in headers {
        total += h.name.len() as u64 + h.value.len() as u64;
    }
    if let Some(b) = body {
        total += b.len() as u64;
    }
    total
}

/// Strips volatile HTTP headers so that IC replicas can reach consensus.
///
/// Each replica makes the same HTTP request independently and the raw
/// responses must match for consensus. Headers like `Date`, `X-Request-Id`,
/// `CF-Ray`, etc. differ across replicas, causing consensus failure.
/// This transform keeps only status + body.
#[query]
fn http_request_transform(args: TransformArgs) -> HttpRequestResult {
    HttpRequestResult {
        status: args.response.status,
        headers: vec![],
        body: args.response.body,
    }
}

/// Builds an [`HttpRequestArgs`] with the given parameters.
///
/// Always includes a `User-Agent` header. Any `extra_headers` are appended
/// after it. Does **not** set `transform`; the public entry points [`get`]
/// and [`post`] attach [`http_request_transform`] before dispatching.
fn build_request(
    url: &str,
    method: HttpMethod,
    body: Option<Vec<u8>>,
    extra_headers: Vec<HttpHeader>,
    max_response_bytes: u64,
) -> HttpRequestArgs {
    let mut headers = vec![HttpHeader {
        name: "User-Agent".to_string(),
        value: USER_AGENT.to_string(),
    }];

    headers.extend(extra_headers);

    HttpRequestArgs {
        url: url.to_string(),
        method,
        body,
        max_response_bytes: Some(max_response_bytes),
        transform: None,
        headers,
    }
}

/// Returns the response unchanged if its status is in the 2xx range,
/// otherwise returns an error containing the status code.
fn validate_response(response: HttpRequestResult) -> Result<HttpRequestResult, String> {
    let status_200: Nat = 200u32.into();
    let status_300: Nat = 300u32.into();

    if response.status >= status_200 && response.status < status_300 {
        Ok(response)
    } else {
        Err(format!(
            "HTTP request failed with status {}",
            response.status
        ))
    }
}

/// Sends the request via the management canister and validates the response.
async fn execute(request: HttpRequestArgs) -> Result<HttpRequestResult, String> {
    match http_request(&request).await {
        Ok(response) => validate_response(response),
        Err(err) => Err(format!("HTTP request failed: {err}")),
    }
}

/// Performs an HTTP GET outcall.
///
/// Sends a GET request to `url` with a `User-Agent` header and validates
/// that the response status is in the 2xx range. Attaches
/// [`http_request_transform`] so IC replicas can reach consensus.
///
/// # Arguments
/// * `url` - The URL to fetch.
/// * `headers` - Additional headers appended after `User-Agent`.
/// * `max_response_bytes` - Upper bound on the response size in bytes. Keep this as low as possible
///   to minimise cycle costs.
pub(crate) async fn get(
    url: &str,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
) -> Result<HttpRequestResult, String> {
    let mut request = build_request(url, HttpMethod::GET, None, headers, max_response_bytes);

    request.transform = Some(transform_context_from_query(
        "http_request_transform".to_string(),
        vec![],
    ));

    execute(request).await
}

/// Telemetry tag for an outgoing exchange-rate outcall. Threaded into
/// [`get_tagged`] so the per-call cost ends up attributed to the right
/// provider in the [`crate::exchange::cost_log`] ring buffer.
///
/// `requested_tokens` is the slice of token-id debug strings the caller
/// is asking the provider for. `path_for_log` is the URL path + query
/// **without** the base host and **without** any API key — already
/// safe to surface to a controller.
pub(crate) struct OutcallTag<'a> {
    pub provider: &'static str,
    pub path_for_log: String,
    pub requested_tokens: &'a [String],
}

/// Same as [`get`] but records a per-call entry in
/// [`crate::exchange::cost_log`]. Used by the exchange-rate fetcher so
/// the controller-facing report can attribute cycle cost to each
/// provider call.
///
/// Cycle cost is computed deterministically via [`outcall_cost_cycles`]
/// from `request_bytes + max_response_bytes + actual_response_bytes`.
/// We do **not** read `canister_cycle_balance()` around the `await`: the
/// exchange path issues many outcalls concurrently via `join_all`, and a
/// balance delta during one `await` is polluted by every concurrent
/// sibling's charges (each measurement ends up off by roughly the
/// fan-out width). The formula avoids this entirely and matches what
/// the management canister actually deducts.
pub(crate) async fn get_tagged(
    url: &str,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
    tag: OutcallTag<'_>,
) -> Result<HttpRequestResult, String> {
    let started_ns = time();
    let request_bytes = request_size_bytes(url, &headers, None);

    let outcome = get(url, headers, max_response_bytes).await;

    let ended_ns = time();

    let (status, response_bytes) = match &outcome {
        Ok(resp) => (status_to_u32(&resp.status), resp.body.len() as u64),
        Err(_) => (0, 0),
    };

    let cycles_charged = outcall_cost_cycles(
        request_bytes,
        max_response_bytes,
        response_bytes,
        outcome.is_ok(),
    );

    cost_log::record(ExchangeOutcallRecord {
        timestamp_ns: started_ns,
        provider: tag.provider.to_string(),
        url_path: tag.path_for_log,
        requested_tokens: tag.requested_tokens.to_vec(),
        cycles_charged,
        response_bytes,
        max_response_bytes,
        status,
        duration_ns: ended_ns.saturating_sub(started_ns),
    });

    outcome
}

fn status_to_u32(status: &Nat) -> u32 {
    // HTTP status codes are always in 100..600, so parsing the Nat's
    // decimal representation as a `u32` is always sufficient. Saturate
    // defensively rather than panicking inside the telemetry path.
    status.0.to_string().parse::<u32>().unwrap_or(u32::MAX)
}

/// Performs an HTTP POST outcall with a JSON body.
///
/// Sends a POST request to `url` with the given `body` and a
/// `Content-Type: application/json` header, then validates that the
/// response status is in the 2xx range. Attaches
/// [`http_request_transform`] so IC replicas can reach consensus.
///
/// # Idempotency
///
/// On the IC every replica in the subnet executes the outcall independently,
/// so the remote server will receive the request *n* times (once per
/// replica). For endpoints that are **not** inherently idempotent, pass an
/// `Idempotency-Key` header via `headers` so the server can deduplicate:
///
/// ```ignore
/// http_outcall::post(
///     url,
///     body,
///     vec![HttpHeader {
///         name: "Idempotency-Key".to_string(),
///         value: unique_key,
///     }],
///     max_response_bytes,
/// )
/// ```
///
/// Whether the server honours this key must be verified on a case-by-case
/// basis.
///
/// # Arguments
/// * `url` - The endpoint to call.
/// * `body` - The JSON request body as raw bytes.
/// * `headers` - Additional headers appended after `User-Agent` and `Content-Type`.
/// * `max_response_bytes` - Upper bound on the response size in bytes. Keep this as low as possible
///   to minimise cycle costs.
#[expect(dead_code)]
pub(crate) async fn post(
    url: &str,
    body: Vec<u8>,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
) -> Result<HttpRequestResult, String> {
    let mut post_headers = vec![HttpHeader {
        name: "Content-Type".to_string(),
        value: "application/json".to_string(),
    }];

    post_headers.extend(headers);

    let mut request = build_request(
        url,
        HttpMethod::POST,
        Some(body),
        post_headers,
        max_response_bytes,
    );

    request.transform = Some(transform_context_from_query(
        "http_request_transform".to_string(),
        vec![],
    ));

    execute(request).await
}

#[cfg(test)]
mod tests {
    use candid::Nat;
    use ic_cdk::management_canister::{HttpHeader, HttpMethod, HttpRequestResult};
    use pretty_assertions::assert_eq;

    use super::{
        build_request, outcall_cost_cycles, request_size_bytes, validate_response,
        HTTP_REQUEST_LINEAR_BASELINE_FEE, HTTP_REQUEST_PER_BYTE_FEE,
        HTTP_REQUEST_QUADRATIC_BASELINE_FEE, HTTP_RESPONSE_PER_BYTE_FEE, SUBNET_REPLICATION_FACTOR,
        USER_AGENT,
    };

    #[test]
    fn test_build_request_sets_url() {
        let request = build_request(
            "https://example.com/api",
            HttpMethod::GET,
            None,
            vec![],
            2048,
        );
        assert_eq!(request.url, "https://example.com/api");
    }

    #[test]
    fn test_build_request_sets_method() {
        let get = build_request("https://example.com", HttpMethod::GET, None, vec![], 1024);
        assert!(matches!(get.method, HttpMethod::GET));

        let post = build_request(
            "https://example.com",
            HttpMethod::POST,
            Some(vec![]),
            vec![],
            1024,
        );
        assert!(matches!(post.method, HttpMethod::POST));
    }

    #[test]
    fn test_build_request_get_has_no_body() {
        let request = build_request("https://example.com", HttpMethod::GET, None, vec![], 1024);
        assert_eq!(request.body, None);
    }

    #[test]
    fn test_build_request_post_includes_body() {
        let body = b"{\"key\":\"value\"}".to_vec();
        let request = build_request(
            "https://example.com",
            HttpMethod::POST,
            Some(body.clone()),
            vec![],
            1024,
        );
        assert_eq!(request.body, Some(body));
    }

    #[test]
    fn test_build_request_sets_max_response_bytes() {
        let request = build_request("https://example.com", HttpMethod::GET, None, vec![], 5000);
        assert_eq!(request.max_response_bytes, Some(5000));
    }

    #[test]
    fn test_build_request_has_no_transform() {
        let request = build_request("https://example.com", HttpMethod::GET, None, vec![], 1024);
        assert_eq!(request.transform, None);
    }

    #[test]
    fn test_build_request_has_only_user_agent_header_by_default() {
        let request = build_request("https://example.com", HttpMethod::GET, None, vec![], 1024);
        assert_eq!(request.headers.len(), 1);
        assert_eq!(request.headers[0].name, "User-Agent");
        assert_eq!(request.headers[0].value, USER_AGENT);
    }

    #[test]
    fn test_build_request_does_not_add_content_type() {
        let request = build_request(
            "https://example.com",
            HttpMethod::POST,
            Some(b"{}".to_vec()),
            vec![],
            1024,
        );
        assert_eq!(request.headers.len(), 1);
        assert_eq!(request.headers[0].name, "User-Agent");
    }

    #[test]
    fn test_build_request_appends_extra_headers() {
        let extra = vec![
            HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            },
            HttpHeader {
                name: "Idempotency-Key".to_string(),
                value: "abc-123".to_string(),
            },
        ];
        let request = build_request(
            "https://example.com",
            HttpMethod::POST,
            Some(b"{}".to_vec()),
            extra,
            1024,
        );
        assert_eq!(request.headers.len(), 3);
        assert_eq!(request.headers[0].name, "User-Agent");
        assert_eq!(request.headers[1].name, "Content-Type");
        assert_eq!(request.headers[2].name, "Idempotency-Key");
        assert_eq!(request.headers[2].value, "abc-123");
    }

    #[test]
    fn test_build_request_extra_headers_on_get() {
        let extra = vec![HttpHeader {
            name: "Authorization".to_string(),
            value: "Bearer token".to_string(),
        }];
        let request = build_request("https://example.com", HttpMethod::GET, None, extra, 1024);
        assert_eq!(request.headers.len(), 2);
        assert_eq!(request.headers[0].name, "User-Agent");
        assert_eq!(request.headers[1].name, "Authorization");
        assert_eq!(request.headers[1].value, "Bearer token");
    }

    #[test]
    fn test_validate_response_accepts_200() {
        let response = HttpRequestResult {
            status: Nat::from(200u32),
            headers: vec![],
            body: b"response body".to_vec(),
        };

        let result = validate_response(response.clone());
        assert_eq!(result, Ok(response));
    }

    #[test]
    fn test_validate_response_accepts_201_created() {
        let response = HttpRequestResult {
            status: Nat::from(201u32),
            headers: vec![],
            body: vec![],
        };

        assert!(validate_response(response).is_ok());
    }

    #[test]
    fn test_validate_response_accepts_204_no_content() {
        let response = HttpRequestResult {
            status: Nat::from(204u32),
            headers: vec![],
            body: vec![],
        };

        assert!(validate_response(response).is_ok());
    }

    #[test]
    fn test_validate_response_preserves_body_and_headers() {
        let response = HttpRequestResult {
            status: Nat::from(200u32),
            headers: vec![HttpHeader {
                name: "Content-Type".to_string(),
                value: "application/json".to_string(),
            }],
            body: b"{\"key\":\"value\"}".to_vec(),
        };

        let result = validate_response(response.clone());
        let ok = result.unwrap();
        assert_eq!(ok.body, b"{\"key\":\"value\"}");
        assert_eq!(ok.headers.len(), 1);
        assert_eq!(ok.headers[0].name, "Content-Type");
    }

    #[test]
    fn test_validate_response_rejects_199() {
        let response = HttpRequestResult {
            status: Nat::from(199u32),
            headers: vec![],
            body: vec![],
        };

        assert!(validate_response(response).is_err());
    }

    #[test]
    fn test_validate_response_rejects_300() {
        let response = HttpRequestResult {
            status: Nat::from(300u32),
            headers: vec![],
            body: vec![],
        };

        assert!(validate_response(response).is_err());
    }

    #[test]
    fn test_validate_response_rejects_404() {
        let response = HttpRequestResult {
            status: Nat::from(404u32),
            headers: vec![],
            body: vec![],
        };

        let result = validate_response(response);
        assert_eq!(
            result,
            Err("HTTP request failed with status 404".to_string())
        );
    }

    #[test]
    fn test_validate_response_rejects_500() {
        let response = HttpRequestResult {
            status: Nat::from(500u32),
            headers: vec![],
            body: vec![],
        };

        let result = validate_response(response);
        assert_eq!(
            result,
            Err("HTTP request failed with status 500".to_string())
        );
    }

    #[test]
    fn test_validate_response_rejects_301_redirect() {
        let response = HttpRequestResult {
            status: Nat::from(301u32),
            headers: vec![],
            body: vec![],
        };

        assert!(validate_response(response).is_err());
    }

    #[test]
    fn test_validate_response_rejects_zero_status() {
        let response = HttpRequestResult {
            status: Nat::from(0u32),
            headers: vec![],
            body: vec![],
        };

        assert!(validate_response(response).is_err());
    }

    fn expected_cost(req: u64, resp: u64) -> u128 {
        let n = SUBNET_REPLICATION_FACTOR;
        let base = (HTTP_REQUEST_LINEAR_BASELINE_FEE + HTTP_REQUEST_QUADRATIC_BASELINE_FEE * n) * n;
        let req_fee = HTTP_REQUEST_PER_BYTE_FEE * n * u128::from(req);
        let resp_fee = HTTP_RESPONSE_PER_BYTE_FEE * n * u128::from(resp);
        base + req_fee + resp_fee
    }

    #[test]
    fn outcall_cost_uses_actual_response_bytes_on_success() {
        // 200-byte request, 8 KiB cap, 489-byte actual response.
        let cost = outcall_cost_cycles(200, 8_192, 489, true);
        assert_eq!(cost, expected_cost(200, 489));
    }

    #[test]
    fn outcall_cost_caps_actual_at_max_response_bytes() {
        // If the reported actual exceeds the cap (defensive), we use the cap.
        let cost = outcall_cost_cycles(100, 1_024, 9_999, true);
        assert_eq!(cost, expected_cost(100, 1_024));
    }

    #[test]
    fn outcall_cost_charges_max_on_transport_failure() {
        // No response → no refund: charge the full max_response_bytes.
        let cost = outcall_cost_cycles(100, 8_192, 0, false);
        assert_eq!(cost, expected_cost(100, 8_192));
    }

    #[test]
    fn outcall_cost_is_minimum_for_empty_response() {
        let cost = outcall_cost_cycles(0, 1_024, 0, true);
        // No request bytes, no response bytes → just the base fee.
        let n = SUBNET_REPLICATION_FACTOR;
        let base = (HTTP_REQUEST_LINEAR_BASELINE_FEE + HTTP_REQUEST_QUADRATIC_BASELINE_FEE * n) * n;
        assert_eq!(cost, base);
    }

    #[test]
    fn outcall_cost_known_icpswap_call() {
        // ICPSwap call shape: max_response_bytes = 8_192,
        // request URL ≈ 60 bytes + Accept header ≈ 22 bytes + UA = ~110 bytes.
        // Actual response observed in staging ≈ 489 bytes.
        let cost = outcall_cost_cycles(110, 8_192, 489, true);
        // Sanity bound: should sit in the 50 M – 200 M cycle range with
        // current constants (base ≈ 49 M + ~5 M response).
        assert!(
            cost > 49_000_000 && cost < 200_000_000,
            "icpswap per-call cost out of expected range: {cost}"
        );
    }

    #[test]
    fn outcall_cost_known_coingecko_call() {
        // CoinGecko call shape: max_response_bytes = 51_200,
        // realistic response 3–8 KiB.
        let cost = outcall_cost_cycles(200, 51_200, 5_000, true);
        // Expected upper bound much higher because the upfront response
        // reservation is 6× larger than ICPSwap's even though we
        // refund unused — but we *do* refund here, so this should still
        // be modest.
        assert!(
            cost > 49_000_000 && cost < 200_000_000,
            "coingecko per-call cost out of expected range: {cost}"
        );
    }

    #[test]
    fn request_size_bytes_counts_url_headers_and_useragent() {
        let url = "https://api.example.com/v1/x";
        let headers = vec![
            HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            },
            HttpHeader {
                name: "Authorization".to_string(),
                value: "Bearer abc".to_string(),
            },
        ];
        let size = request_size_bytes(url, &headers, None);
        // url + (User-Agent + UA value) + (Accept + value) + (Authorization + value)
        let expected = url.len() as u64
            + ("User-Agent".len() + USER_AGENT.len()) as u64
            + ("Accept".len() + "application/json".len()) as u64
            + ("Authorization".len() + "Bearer abc".len()) as u64;
        assert_eq!(size, expected);
    }

    #[test]
    fn request_size_bytes_includes_body() {
        let body = b"{\"foo\":1}";
        let size = request_size_bytes("https://x/y", &[], Some(body));
        let expected =
            "https://x/y".len() as u64 + ("User-Agent".len() + USER_AGENT.len()) as u64 + 9;
        assert_eq!(size, expected);
    }
}
