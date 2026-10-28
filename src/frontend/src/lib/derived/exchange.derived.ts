import { EXCHANGE_DISABLED } from '$env/exchange.env';
import {
	ARBITRUM_ETH_TOKEN_ID,
	ARBITRUM_SEPOLIA_ETH_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-arbitrum/tokens.eth.env';
import {
	BASE_ETH_TOKEN_ID,
	BASE_SEPOLIA_ETH_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import {
	BNB_MAINNET_TOKEN_ID,
	BNB_TESTNET_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-bsc/tokens.bnb.env';
import {
	POL_AMOY_TOKEN_ID,
	POL_MAINNET_TOKEN_ID
} from '$env/tokens/tokens-evm/tokens-polygon/tokens.pol.env';
import { ROBINHOOD_ETH_TOKEN_ID } from '$env/tokens/tokens-evm/tokens-robinhood/tokens.eth.env';
import {
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID, TESTICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TOKEN_ID
} from '$env/tokens/tokens.sol.env';
import { XRP_TOKEN_ID } from '$env/tokens/tokens.xrp.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import { isErc20Icp } from '$eth/utils/token.utils';
import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { ExchangesData } from '$lib/types/exchange';
import { derivedMemo } from '$lib/utils/derived-memo.utils';
import { exchangesDataEqual, icrcTokenPrice } from '$lib/utils/exchange.utils';
import { enabledSplTokens } from '$sol/derived/spl.derived';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const exchangeInitialized: Readable<boolean> = derived(
	[exchangeStore],
	([$exchangeStore]) => EXCHANGE_DISABLED || nonNullish($exchangeStore)
);

export const exchangeNotInitialized: Readable<boolean> = derived(
	[exchangeInitialized],
	([$exchangeInitialized]) => !$exchangeInitialized
);

export const exchanges: Readable<ExchangesData> = derivedMemo(
	[exchangeStore, enabledErc20Tokens, erc4626Tokens, allIcrcTokens, enabledSplTokens],
	([$exchangeStore, $erc20Tokens, $erc4626Tokens, $icrcTokens, $splTokens]) => {
		const ethPrice = $exchangeStore?.ethereum;
		const btcPrice = $exchangeStore?.bitcoin;
		const icpPrice = $exchangeStore?.['internet-computer'];
		const solPrice = $exchangeStore?.solana;
		const xrpPrice = $exchangeStore?.ripple;
		const bnbPrice = $exchangeStore?.binancecoin;
		const polPrice = $exchangeStore?.['polygon-ecosystem-token'];

		return {
			// TODO: improve feed price on testnets, for now we assume that 1 token mainnet = 1 token testnet
			[BTC_TESTNET_TOKEN_ID]: btcPrice,
			[BTC_MAINNET_TOKEN_ID]: btcPrice,
			[BTC_REGTEST_TOKEN_ID]: btcPrice,
			[ETHEREUM_TOKEN_ID]: ethPrice,
			[SEPOLIA_TOKEN_ID]: ethPrice,
			[ICP_TOKEN_ID]: icpPrice,
			[TESTICP_TOKEN_ID]: icpPrice,
			[SOLANA_TOKEN_ID]: solPrice,
			[SOLANA_DEVNET_TOKEN_ID]: solPrice,
			[SOLANA_LOCAL_TOKEN_ID]: solPrice,
			[XRP_TOKEN_ID]: xrpPrice,
			[BASE_ETH_TOKEN_ID]: ethPrice,
			[BASE_SEPOLIA_ETH_TOKEN_ID]: ethPrice,
			[BNB_MAINNET_TOKEN_ID]: bnbPrice,
			[BNB_TESTNET_TOKEN_ID]: bnbPrice,
			[POL_MAINNET_TOKEN_ID]: polPrice,
			[POL_AMOY_TOKEN_ID]: polPrice,
			[ARBITRUM_ETH_TOKEN_ID]: ethPrice,
			[ARBITRUM_SEPOLIA_ETH_TOKEN_ID]: ethPrice,
			[ROBINHOOD_ETH_TOKEN_ID]: ethPrice,
			...Object.entries($exchangeStore ?? {}).reduce((acc, [key, currentPrice]) => {
				const tokens = [
					...[...$erc20Tokens, ...$erc4626Tokens].filter(
						({ address }) => address.toLowerCase() === key.toLowerCase()
					),
					...$splTokens.filter(({ address }) => address.toLowerCase() === key.toLowerCase())
				];

				return {
					...acc,
					...tokens.reduce((inner, token) => ({ ...inner, [token.id]: currentPrice }), {})
				};
			}, {}),
			...$erc20Tokens.filter(isErc20Icp).reduce(
				(acc, { id }) => ({
					...acc,
					[id]: icpPrice
				}),
				{}
			),
			...$icrcTokens.reduce(
				(acc, token) => ({
					...acc,
					[token.id]: icrcTokenPrice({ token, prices: $exchangeStore })
				}),
				{}
			)
		};
	},
	exchangesDataEqual
);
