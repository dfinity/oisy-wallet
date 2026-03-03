use crate::utils::http::perform_http_get;

pub async fn fetch_coingecko_token_prices(
    platform: &str,
    addresses: &[String],
) -> Result<std::collections::HashMap<String, (Option<f64>, Option<f64>, Option<f64>)>, String> {
    let addr_str = addresses.join(",");
    let url = format!("https://api.coingecko.com/api/v3/simple/token_price/{platform}?contract_addresses={addr_str}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true");

    let response = perform_http_get(&url, 8192).await?;
    let json: serde_json::Value =
        serde_json::from_slice(&response.body).map_err(|e| format!("Failed to parse JSON: {e}"))?;

    let mut result = std::collections::HashMap::new();
    for addr in addresses {
        if let Some(data) = json.get(addr.to_lowercase()) {
            let price = data["usd"].as_f64();
            let change = data["usd_24h_change"].as_f64();
            let market_cap = data["usd_market_cap"].as_f64();
            result.insert(addr.clone(), (price, change, market_cap));
        }
    }
    Ok(result)
}
