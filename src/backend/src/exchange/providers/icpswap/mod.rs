use ic_cdk::{api::time, management_canister::HttpHeader};
use serde::Deserialize;
use serde_json::from_slice;
use shared::types::{exchange::ExchangeData, token_id::TokenId};

use crate::{
    exchange::supplemental::{SupplementalPriceProvider, SupplementalPricesFuture},
    types::storable::StoredTokenId,
    utils::http_outcall,
};

const DEFAULT_BASE_URL: &str = "https://api.icpswap.com";
/// `ICPSwap` token info responses are small JSON objects; keep the cap tight for cycle costs.
const MAX_RESPONSE_BYTES: u64 = 8_192;
/// Pools with TVL at or below this threshold are considered stale and their prices are discarded.
const MIN_TVL_USD: f64 = 10.0;

#[derive(Debug, Deserialize)]
struct IcpSwapEnvelope {
    code: i64,
    #[serde(default)]
    data: Option<IcpSwapTokenBody>,
}

#[derive(Debug, Deserialize)]
struct IcpSwapTokenBody {
    #[serde(rename = "tokenLedgerId")]
    _token_ledger_id: String,
    price: String,
    #[serde(rename = "priceChange24H")]
    price_change_24h: String,
    #[serde(rename = "tvlUSD")]
    tvl_usd: String,
}

fn exchange_data_from_icpswap_envelope(
    parsed: IcpSwapEnvelope,
    timestamp_ns: u64,
) -> Option<ExchangeData> {
    if parsed.code != 0 {
        return None;
    }
    let token = parsed.data?;
    let price: f64 = token.price.parse().ok()?;
    if !price.is_finite() || price <= 0.0 {
        return None;
    }
    let tvl: f64 = token.tvl_usd.parse().ok()?;
    if !tvl.is_finite() || tvl <= MIN_TVL_USD {
        return None;
    }
    let price_24h_change_pct = token
        .price_change_24h
        .parse()
        .ok()
        .filter(|v: &f64| v.is_finite());
    Some(ExchangeData {
        timestamp_ns,
        price: Some(price),
        price_24h_change_pct,
        market_cap: None,
    })
}

fn parse_icpswap_body(body: &[u8]) -> Option<ExchangeData> {
    let parsed: IcpSwapEnvelope = from_slice(body).ok()?;
    exchange_data_from_icpswap_envelope(parsed, time())
}

/// Supplemental USD prices for ICRC ledger tokens via [ICPSwap](https://api.icpswap.com).
#[derive(Debug, Clone)]
pub(crate) struct IcpSwapProvider {
    base_url: String,
}

impl Default for IcpSwapProvider {
    fn default() -> Self {
        Self {
            base_url: DEFAULT_BASE_URL.to_string(),
        }
    }
}

impl IcpSwapProvider {
    #[expect(dead_code)]
    pub(crate) fn with_base_url(base_url: String) -> Self {
        Self { base_url }
    }

    async fn fetch_icrc_token_usd(
        &self,
        ledger_text: &str,
    ) -> Result<Option<ExchangeData>, String> {
        let url = format!(
            "{}/info/token/{ledger_text}",
            self.base_url.trim_end_matches('/')
        );

        let response = http_outcall::get(
            &url,
            vec![HttpHeader {
                name: "Accept".to_string(),
                value: "application/json".to_string(),
            }],
            MAX_RESPONSE_BYTES,
        )
        .await?;

        Ok(parse_icpswap_body(&response.body))
    }
}

impl SupplementalPriceProvider for IcpSwapProvider {
    fn id(&self) -> &'static str {
        "icpswap"
    }

    fn supplement<'a>(&'a self, missing: &'a [StoredTokenId]) -> SupplementalPricesFuture<'a> {
        Box::pin(async move {
            let mut out = Vec::new();

            for stored in missing {
                let StoredTokenId(TokenId::Icrc(ledger_id)) = stored else {
                    continue;
                };

                let ledger_text = ledger_id.to_text();

                match self.fetch_icrc_token_usd(&ledger_text).await {
                    Ok(Some(data)) => out.push((stored.clone(), data)),
                    Ok(None) => {}
                    Err(err) => {
                        ic_cdk::println!("ICPSwap price fetch for {ledger_text} failed: {err}");
                    }
                }
            }

            Ok(out)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_icpswap_body_success() {
        let json = br#"{"code":0,"message":null,"data":{"tokenLedgerId":"ryjl3-tyaaa-aaaaa-aaaba-cai","tokenName":"x","tokenSymbol":"X","price":"1.25","priceChange24H":"-2.5","tvlUSD":"50000","tvlUSDChange24H":"0","txCount24H":"0","volumeUSD24H":"0","volumeUSD7D":"0","totalVolumeUSD":"0","priceLow24H":"0","priceHigh24H":"0","priceLow7D":"0","priceHigh7D":"0","priceLow30D":"0","priceHigh30D":"0"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        let d = exchange_data_from_icpswap_envelope(parsed, 99).unwrap();
        assert_eq!(d.timestamp_ns, 99);
        assert_eq!(d.price, Some(1.25));
        assert_eq!(d.price_24h_change_pct, Some(-2.5));
    }

    #[test]
    fn parse_icpswap_body_rejects_nonzero_code() {
        let json = br#"{"code":404,"message":"not found","data":null}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_filters_non_finite_price_change() {
        let json =
            br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.0","priceChange24H":"NaN","tvlUSD":"100"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        let d = exchange_data_from_icpswap_envelope(parsed, 0).unwrap();
        assert_eq!(d.price, Some(1.0));
        assert_eq!(d.price_24h_change_pct, None);
    }

    #[test]
    fn parse_icpswap_body_rejects_bad_price() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"0","priceChange24H":"0","tvlUSD":"100"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_rejects_stale_pool() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5","tvlUSD":"1.78"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_rejects_zero_tvl() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5","tvlUSD":"0"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_rejects_tvl_at_threshold() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5","tvlUSD":"10"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_accepts_tvl_above_threshold() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5","tvlUSD":"10.01"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        let d = exchange_data_from_icpswap_envelope(parsed, 0).unwrap();
        assert_eq!(d.price, Some(1.25));
    }

    #[test]
    fn parse_icpswap_body_rejects_nan_tvl() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5","tvlUSD":"NaN"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_rejects_negative_tvl() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5","tvlUSD":"-500"}}"#;
        let parsed: IcpSwapEnvelope = serde_json::from_slice(json).unwrap();
        assert!(exchange_data_from_icpswap_envelope(parsed, 0).is_none());
    }

    #[test]
    fn parse_icpswap_body_rejects_missing_tvl() {
        let json = br#"{"code":0,"data":{"tokenLedgerId":"x","price":"1.25","priceChange24H":"-2.5"}}"#;
        let parsed: Result<IcpSwapEnvelope, _> = serde_json::from_slice(json);
        assert!(parsed
            .ok()
            .and_then(|e| exchange_data_from_icpswap_envelope(e, 0))
            .is_none());
    }
}
