import { EXCHANGE_DISABLED } from '$env/exchange.env';
import {
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN_ID,
	SOLANA_LOCAL_TOKEN_ID,
	SOLANA_TESTNET_TOKEN_ID,
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

		return {
			// TODO: improve feed price on testnets, for now we assume that 1 token mainnet = 1 token testnet
			[BTC_TESTNET_TOKEN_ID]: btcPrice,
			[BTC_MAINNET_TOKEN_ID]: btcPrice,
			[BTC_REGTEST_TOKEN_ID]: btcPrice,
			[ETHEREUM_TOKEN_ID]: ethPrice,
			[SEPOLIA_TOKEN_ID]: ethPrice,
			[ICP_TOKEN_ID]: icpPrice,
			[SOLANA_TOKEN_ID]: solPrice,
			[SOLANA_TESTNET_TOKEN_ID]: solPrice,
			[SOLANA_DEVNET_TOKEN_ID]: solPrice,
			[SOLANA_LOCAL_TOKEN_ID]: solPrice,
			...Object.entries($exchangeStore ?? {}).reduce((acc, [key, currentPrice]) => {
				const token =
					$erc20Tokens.find(({ address }) => address.toLowerCase() === key.toLowerCase()) ??
					$splTokens.find(({ address }) => address.toLowerCase() === key.toLowerCase());

				return {
					...acc,
					...(nonNullish(token) && { [token.id]: currentPrice })
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
			...$splTokens
				.filter(({ twinToken }) => nonNullish(twinToken))
				.reduce((acc, { id, twinToken }) => {
					const address = (twinToken as Partial<Erc20Token>).address;
					const price = nonNullish(address) ? $exchangeStore?.[address.toLowerCase()] : undefined;

					return {
						...acc,
						[id]: price
					};
				}, {}),
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
