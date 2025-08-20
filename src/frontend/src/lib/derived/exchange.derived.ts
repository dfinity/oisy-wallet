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
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import type { Erc20Token } from '$eth/types/erc20';
import type { IcCkToken } from '$icp/types/ic-token';
import { allIcrcTokens } from '$lib/derived/all-tokens.derived';
import { exchangeStore } from '$lib/stores/exchange.store';
import type { ExchangesData } from '$lib/types/exchange';
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

// TODO: create tests for store
export const exchanges: Readable<ExchangesData> = derived(
	[exchangeStore, enabledErc20Tokens, allIcrcTokens, enabledSplTokens],
	([$exchangeStore, $erc20Tokens, $icrcTokens, $splTokens]) => {
		const ethPrice = $exchangeStore?.ethereum;
		const btcPrice = $exchangeStore?.bitcoin;
		const icpPrice = $exchangeStore?.['internet-computer'];
		const solPrice = $exchangeStore?.solana;
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
			[BASE_ETH_TOKEN_ID]: ethPrice,
			[BASE_SEPOLIA_ETH_TOKEN_ID]: ethPrice,
			[BNB_MAINNET_TOKEN_ID]: bnbPrice,
			[BNB_TESTNET_TOKEN_ID]: bnbPrice,
			[POL_MAINNET_TOKEN_ID]: polPrice,
			[POL_AMOY_TOKEN_ID]: polPrice,
			[ARBITRUM_ETH_TOKEN_ID]: ethPrice,
			[ARBITRUM_SEPOLIA_ETH_TOKEN_ID]: ethPrice,
			...Object.entries($exchangeStore ?? {}).reduce((acc, [key, currentPrice]) => {
				const tokens = [
					...$erc20Tokens.filter(({ address }) => address.toLowerCase() === key.toLowerCase()),
					...$splTokens.filter(({ address }) => address.toLowerCase() === key.toLowerCase())
				];

				return {
					...acc,
					...tokens.reduce((inner, token) => ({ ...inner, [token.id]: currentPrice }), {})
				};
			}, {}),
			...$erc20Tokens
				.filter(({ exchange }) => exchange === 'icp')
				.reduce(
					(acc, { id }) => ({
						...acc,
						[id]: icpPrice
					}),
					{}
				),
			...$icrcTokens.reduce((acc, token) => {
				const { id, ledgerCanisterId, exchangeCoinId } = token;

				const icrcPrice = $exchangeStore?.[ledgerCanisterId];

				if (nonNullish(icrcPrice)) {
					return {
						...acc,
						[id]: icrcPrice
					};
				}

				const { twinToken } = token as Partial<IcCkToken>;
				const { address } = (twinToken as Partial<Erc20Token>) ?? { address: undefined };
				const ckEthereumPrice = nonNullish(address)
					? $exchangeStore?.[address.toLowerCase()]
					: ethPrice;

				return {
					...acc,
					[id]:
						exchangeCoinId === 'ethereum'
							? ckEthereumPrice
							: exchangeCoinId === 'bitcoin'
								? btcPrice
								: exchangeCoinId === 'solana'
									? solPrice
									: exchangeCoinId === 'internet-computer'
										? icpPrice
										: undefined
				};
			}, {})
		};
	}
);
