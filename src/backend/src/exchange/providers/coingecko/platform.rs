/// Maps an EVM chain ID to the corresponding `CoinGecko` platform identifier.
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
}
