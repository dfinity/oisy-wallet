import type { IcToken } from '$icp/types/ic-token';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, get, writable, type Readable } from 'svelte/store';

export interface SwapData {
	sourceToken?: Token;
	destinationToken?: Token;
}

export const initSwapContext = (swapData: SwapData = {}): SwapContext => {
	const data = writable<SwapData>(swapData);

	const sourceToken = derived([data], ([{ sourceToken }]) => sourceToken as IcToken);
	const destinationToken = derived([data], ([{ destinationToken }]) => destinationToken as IcToken);

	const sourceTokenBalance = derived(
		[balancesStore, sourceToken],
		([$balancesStore, $sourceToken]) =>
			nonNullish($sourceToken) ? $balancesStore?.[$sourceToken.id]?.data : undefined
	);
	const destinationTokenBalance = derived(
		[balancesStore, destinationToken],
		([$balancesStore, $destinationToken]) =>
			nonNullish($destinationToken) ? $balancesStore?.[$destinationToken.id]?.data : undefined
	);

	const sourceTokenExchangeRate = derived([exchanges, sourceToken], ([$exchanges, $sourceToken]) =>
		nonNullish($sourceToken) ? $exchanges?.[$sourceToken.id]?.usd : undefined
	);
	const destinationTokenExchangeRate = derived(
		[exchanges, destinationToken],
		([$exchanges, $destinationToken]) =>
			nonNullish($destinationToken) ? $exchanges?.[$destinationToken.id]?.usd : undefined
	);

	return {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		setSourceToken: (token: Token) => (get(data).sourceToken = token),
		setDestinationToken: (token: Token) => (get(data).destinationToken = token),
		switchTokens: () => {
			const currentStore = get(data);

			data.update(() => ({
				sourceToken: currentStore.destinationToken,
				destinationToken: currentStore.sourceToken
			}));
		}
	};
};

export interface SwapContext {
	sourceToken: Readable<IcToken | undefined>;
	destinationToken: Readable<IcToken | undefined>;
	sourceTokenBalance: Readable<BigNumber | undefined>;
	destinationTokenBalance: Readable<BigNumber | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;
	setSourceToken: (token: Token) => void;
	setDestinationToken: (token: Token) => void;
	switchTokens: () => void;
}

export const SWAP_CONTEXT_KEY = Symbol('swap');
