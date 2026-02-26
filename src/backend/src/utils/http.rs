use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse,
};

pub async fn perform_http_get(url: &str, max_response_bytes: u64) -> Result<HttpResponse, String> {
    let request_headers = vec![HttpHeader {
        name: "User-Agent".to_string(),
        value: "OisyWalletBackend".to_string(),
    }];

    let request = CanisterHttpRequestArgument {
        url: url.to_string(),
        method: HttpMethod::GET,
        body: None,
        max_response_bytes: Some(max_response_bytes),
        transform: None,
        headers: request_headers,
    };

    match http_request(request, 10_000_000_000).await {
        Ok((response,)) => {
            if response.status == 200u32 {
                Ok(response)
            } else {
                Err(format!(
                    "HTTP request failed with status {}",
                    response.status
                ))
            }
        }
        Err((code, msg)) => Err(format!("HTTP request failed: {code:?} {msg}")),
    }
}
