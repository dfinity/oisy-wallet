use candid::Nat;
use ic_cdk::management_canister::{
    http_request, HttpHeader, HttpMethod, HttpRequestArgs, HttpRequestResult,
};

const USER_AGENT: &str = "OisyWalletBackend";

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

    if body.is_some() {
        headers.push(HttpHeader {
            name: "Content-Type".to_string(),
            value: "application/json".to_string(),
        });
    }

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

fn validate_response(response: HttpRequestResult) -> Result<HttpRequestResult, String> {
    let ok: Nat = 200u32.into();
    if response.status == ok {
        Ok(response)
    } else {
        Err(format!(
            "HTTP request failed with status {}",
            response.status
        ))
    }
}

async fn execute(request: &HttpRequestArgs) -> Result<HttpRequestResult, String> {
    match http_request(request).await {
        Ok(response) => validate_response(response),
        Err(err) => Err(format!("HTTP request failed: {err}")),
    }
}

#[expect(dead_code)]
pub(crate) async fn get(url: &str, max_response_bytes: u64) -> Result<HttpRequestResult, String> {
    let request = build_request(url, HttpMethod::GET, None, vec![], max_response_bytes);
    execute(&request).await
}

#[expect(dead_code)]
pub(crate) async fn post(
    url: &str,
    body: Vec<u8>,
    headers: Vec<HttpHeader>,
    max_response_bytes: u64,
) -> Result<HttpRequestResult, String> {
    let request = build_request(url, HttpMethod::POST, Some(body), headers, max_response_bytes);
    execute(&request).await
}

#[cfg(test)]
mod tests {
    use pretty_assertions::assert_eq;

    use super::*;

    #[test]
    fn test_build_request_sets_url() {
        let request =
            build_request("https://example.com/api", HttpMethod::GET, None, vec![], 2048);
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
    fn test_build_request_get_has_only_user_agent_header() {
        let request = build_request("https://example.com", HttpMethod::GET, None, vec![], 1024);
        assert_eq!(request.headers.len(), 1);
        assert_eq!(request.headers[0].name, "User-Agent");
        assert_eq!(request.headers[0].value, USER_AGENT);
    }

    #[test]
    fn test_build_request_post_has_user_agent_and_content_type_headers() {
        let request = build_request(
            "https://example.com",
            HttpMethod::POST,
            Some(b"{}".to_vec()),
            vec![],
            1024,
        );
        assert_eq!(request.headers.len(), 2);
        assert_eq!(request.headers[0].name, "User-Agent");
        assert_eq!(request.headers[0].value, USER_AGENT);
        assert_eq!(request.headers[1].name, "Content-Type");
        assert_eq!(request.headers[1].value, "application/json");
    }

    #[test]
    fn test_build_request_appends_extra_headers() {
        let extra = vec![HttpHeader {
            name: "Idempotency-Key".to_string(),
            value: "abc-123".to_string(),
        }];
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
        let request = build_request(
            "https://example.com",
            HttpMethod::GET,
            None,
            extra,
            1024,
        );
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

        let result = validate_response(response);
        assert!(result.is_err());
    }

    #[test]
    fn test_validate_response_rejects_zero_status() {
        let response = HttpRequestResult {
            status: Nat::from(0u32),
            headers: vec![],
            body: vec![],
        };

        let result = validate_response(response);
        assert!(result.is_err());
    }
}
