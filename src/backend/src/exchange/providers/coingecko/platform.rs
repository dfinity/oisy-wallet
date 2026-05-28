use shared::types::token_id::TokenId;

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

/// Whether this `TokenId` is something we can ever fetch a USD price for via
/// the configured providers (`CoinGecko` primary, `ICPSwap` supplemental for
/// ICRC).
///
/// Returns `false` for testnet variants, NFT standards (ERC-721/1155, EXT,
/// DIP-721, `ICPunks`, ICRC-7), ERC-4626 vault tokens (priced FE-side from
/// their underlying ERC-20), and EVM/ERC-20 tokens on chains we don't have
/// a `CoinGecko` mapping for.
#[must_use]
pub fn is_priceable_token_id(token_id: &TokenId) -> bool {
    match token_id {
        TokenId::EvmNative(chain_id) => coingecko_native_coin(*chain_id).is_some(),
        TokenId::Erc20(_, chain_id) => coingecko_platform(*chain_id).is_some(),
        TokenId::Icrc(_)
        | TokenId::IcpNative
        | TokenId::SolNativeMainnet
        | TokenId::BtcNativeMainnet
        | TokenId::SplMainnet(_) => true,
        TokenId::Erc721(..)
        | TokenId::Erc1155(..)
        | TokenId::Erc4626(..)
        | TokenId::SplDevnet(_)
        | TokenId::SolNativeDevnet
        | TokenId::BtcNativeTestnet
        | TokenId::ExtV2(_)
        | TokenId::Dip721(_)
        | TokenId::IcPunks(_)
        | TokenId::Icrc7(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use shared::types::custom_token::ChainId;

    use super::{coingecko_native_coin, coingecko_platform, is_priceable_token_id, TokenId};

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

    fn erc(addr: &str, chain_id: ChainId) -> TokenId {
        TokenId::Erc20(
            shared::types::custom_token::ErcTokenId(addr.to_string()),
            chain_id,
        )
    }

    #[test]
    fn priceable_includes_supported_native_and_contract_chains() {
        assert!(is_priceable_token_id(&TokenId::EvmNative(1)));
        assert!(is_priceable_token_id(&TokenId::EvmNative(56)));
        assert!(is_priceable_token_id(&TokenId::EvmNative(137)));
        assert!(is_priceable_token_id(&TokenId::EvmNative(8453)));
        assert!(is_priceable_token_id(&TokenId::EvmNative(42161)));
        assert!(is_priceable_token_id(&erc("0xabc", 1)));
        assert!(is_priceable_token_id(&erc("0xabc", 42161)));
        assert!(is_priceable_token_id(&TokenId::IcpNative));
        assert!(is_priceable_token_id(&TokenId::SolNativeMainnet));
        assert!(is_priceable_token_id(&TokenId::BtcNativeMainnet));
        assert!(is_priceable_token_id(
            &TokenId::Icrc(Principal::anonymous())
        ));
        assert!(is_priceable_token_id(&TokenId::SplMainnet(
            shared::types::custom_token::SplTokenId("So111".to_string())
        )));
    }

    #[test]
    fn priceable_excludes_unsupported_chains_and_testnets() {
        assert!(!is_priceable_token_id(&TokenId::EvmNative(999)));
        assert!(!is_priceable_token_id(&erc("0xabc", 999)));
        assert!(!is_priceable_token_id(&TokenId::SolNativeDevnet));
        assert!(!is_priceable_token_id(&TokenId::BtcNativeTestnet));
        assert!(!is_priceable_token_id(&TokenId::SplDevnet(
            shared::types::custom_token::SplTokenId("dev".to_string())
        )));
    }

    #[test]
    fn priceable_excludes_nft_and_vault_standards() {
        assert!(!is_priceable_token_id(&TokenId::Erc721(
            shared::types::custom_token::ErcTokenId("0xabc".to_string()),
            1
        )));
        assert!(!is_priceable_token_id(&TokenId::Erc1155(
            shared::types::custom_token::ErcTokenId("0xabc".to_string()),
            1
        )));
        assert!(!is_priceable_token_id(&TokenId::Erc4626(
            shared::types::custom_token::ErcTokenId("0xabc".to_string()),
            1
        )));
        assert!(!is_priceable_token_id(&TokenId::ExtV2(
            Principal::anonymous()
        )));
        assert!(!is_priceable_token_id(&TokenId::Dip721(
            Principal::anonymous()
        )));
        assert!(!is_priceable_token_id(&TokenId::IcPunks(
            Principal::anonymous()
        )));
        assert!(!is_priceable_token_id(&TokenId::Icrc7(
            Principal::anonymous()
        )));
    }
}
