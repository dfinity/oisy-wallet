use candid::Nat;
use ic_cdk::{
    api::time,
    management_canister::{
        cost_http_request, http_request, transform_context_from_query, HttpHeader, HttpMethod,
        HttpRequestArgs, HttpRequestResult, TransformArgs, TransformContext,
    },
    query,
};
use shared::types::exchange_cost::ExchangeOutcallRecord;

use crate::exchange::cost_log;

const USER_AGENT: &str = "OisyWalletBackend";

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
        is_replicated: None,
    }
}

fn build_get_request(
    url: &str,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
    replicated: bool,
    transform: Option<TransformContext>,
) -> HttpRequestArgs {
    let mut request = build_request(url, HttpMethod::GET, None, headers, max_response_bytes);

    request.is_replicated = Some(replicated);
    request.transform = transform;

    request
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

/// GET outcall that records a per-call entry in
/// [`crate::exchange::cost_log`]. Used by the exchange-rate fetcher so
/// the controller-facing report can attribute cycle cost to each
/// provider call.
///
/// `replicated` controls IC consensus: `true` runs the request on every
/// replica with the [`http_request_transform`] reconciliation step
/// (expensive but verified); `false` runs it on a single replica
/// (cheaper, unverified). The transform is attached regardless so the
/// response (status + body) is normalised the same way in both modes.
///
/// Cycle cost is taken from the [`cost_http_request`] system API on the
/// exact request we dispatch. That is what `http_request` itself uses to
/// attach cycles, so the recorded value is the precise amount the IC
/// charges — for the actual subnet size, and automatically correct if IC
/// pricing changes. We deliberately do **not** read
/// `canister_cycle_balance()` around the `await`: the exchange path issues
/// many outcalls concurrently via `join_all`, so a balance delta during
/// one `await` is polluted by every concurrent sibling's charge.
pub(crate) async fn get_tagged(
    url: &str,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
    tag: OutcallTag<'_>,
    replicated: bool,
) -> Result<HttpRequestResult, String> {
    let started_ns = time();

    let transform = transform_context_from_query("http_request_transform".to_string(), vec![]);

    let request = build_get_request(
        url,
        headers,
        max_response_bytes,
        replicated,
        Some(transform),
    );
    let cycles_charged = cost_http_request(&request);

    let outcome = execute(request).await;

    let ended_ns = time();

    let (status, response_bytes) = match &outcome {
        Ok(resp) => (status_to_u32(&resp.status), resp.body.len() as u64),
        Err(_) => (0, 0),
    };

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
    use candid::{Func, Nat, Principal};
    use ic_cdk::management_canister::{
        HttpHeader, HttpMethod, HttpRequestResult, TransformContext, TransformFunc,
    };
    use pretty_assertions::assert_eq;

    use super::{build_get_request, build_request, validate_response, USER_AGENT};

    fn mock_transform_context() -> TransformContext {
        TransformContext {
            function: TransformFunc(Func {
                principal: Principal::from_slice(&[1]),
                method: "http_request_transform".to_string(),
            }),
            context: vec![],
        }
    }

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
    fn test_build_get_request_sets_replicated_flag() {
        for replicated in [true, false] {
            let request = build_get_request("https://example.com", vec![], 1024, replicated, None);

            assert_eq!(request.is_replicated, Some(replicated));
        }
    }

    #[test]
    fn test_build_get_request_preserves_request_fields() {
        let extra = vec![HttpHeader {
            name: "Authorization".to_string(),
            value: "Bearer token".to_string(),
        }];
        let transform = mock_transform_context();
        let request = build_get_request(
            "https://example.com/api",
            extra,
            4096,
            true,
            Some(transform.clone()),
        );

        assert_eq!(request.url, "https://example.com/api");
        assert!(matches!(request.method, HttpMethod::GET));
        assert_eq!(request.body, None);
        assert_eq!(request.max_response_bytes, Some(4096));
        assert_eq!(request.transform, Some(transform));
        assert_eq!(request.headers.len(), 2);
        assert_eq!(request.headers[0].name, "User-Agent");
        assert_eq!(request.headers[0].value, USER_AGENT);
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
}
