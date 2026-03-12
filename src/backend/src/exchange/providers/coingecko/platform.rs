/// Maps an EVM chain ID to the corresponding `CoinGecko` platform identifier
/// used in the `/simple/token_price` endpoint for contract-based tokens.
pub fn coingecko_platform(chain_id: u64) -> Option<&'static str> {
    match chain_id {
        1 => Some("ethereum"),
        56 => Some("binance-smart-chain"),
        137 => Some("polygon-pos"),
        8453 => Some("base"),
        42161 => Some("arbitrum-one"),
        _ => None,
    }
}

/// Maps an EVM chain ID to the `CoinGecko` coin identifier for its native token,
/// used in the `/simple/price` endpoint.
pub fn coingecko_native_coin(chain_id: u64) -> Option<&'static str> {
    match chain_id {
        1 | 8453 | 42161 => Some("ethereum"),
        56 => Some("binancecoin"),
        137 => Some("polygon-ecosystem-token"),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_known_platforms() {
        assert_eq!(coingecko_platform(1), Some("ethereum"));
        assert_eq!(coingecko_platform(56), Some("binance-smart-chain"));
        assert_eq!(coingecko_platform(137), Some("polygon-pos"));
        assert_eq!(coingecko_platform(8453), Some("base"));
        assert_eq!(coingecko_platform(42161), Some("arbitrum-one"));
    }

    #[test]
    fn test_unknown_chain_id_returns_none() {
        assert_eq!(coingecko_platform(999), None);
        assert_eq!(coingecko_platform(0), None);
    }

    #[test]
    fn test_native_coin_ethereum_and_l2s() {
        assert_eq!(coingecko_native_coin(1), Some("ethereum"));
        assert_eq!(coingecko_native_coin(8453), Some("ethereum"));
        assert_eq!(coingecko_native_coin(42161), Some("ethereum"));
    }

    #[test]
    fn test_native_coin_other_chains() {
        assert_eq!(coingecko_native_coin(56), Some("binancecoin"));
        assert_eq!(coingecko_native_coin(137), Some("polygon-ecosystem-token"));
    }

    #[test]
    fn test_native_coin_unknown_returns_none() {
        assert_eq!(coingecko_native_coin(999), None);
    }
}
