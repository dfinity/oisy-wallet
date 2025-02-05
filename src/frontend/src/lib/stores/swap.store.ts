import type { IcrcCustomToken } from '$icp/types/icrc-custom-token';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { derived, writable, type Readable } from 'svelte/store';

export interface SwapData {
	sourceToken?: IcrcCustomToken;
	destinationToken?: IcrcCustomToken;
}

export const initSwapContext = (swapData: SwapData = {}): SwapContext => {
	const data = writable<SwapData>(swapData);
	const { update } = data;

	const sourceToken = derived([data], ([{ sourceToken }]) => sourceToken);
	const destinationToken = derived([data], ([{ destinationToken }]) => destinationToken);

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
		setSourceToken: (token: IcrcCustomToken) =>
			update((state) => ({
				...state,
				sourceToken: token
			})),
		setDestinationToken: (token: IcrcCustomToken) =>
			update((state) => ({
				...state,
				destinationToken: token
			})),
		switchTokens: () =>
			update((state) => ({
				sourceToken: state.destinationToken,
				destinationToken: state.sourceToken
			}))
	};
};

export interface SwapContext {
	sourceToken: Readable<IcrcCustomToken | undefined>;
	destinationToken: Readable<IcrcCustomToken | undefined>;
	sourceTokenBalance: Readable<BigNumber | undefined>;
	destinationTokenBalance: Readable<BigNumber | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;
	setSourceToken: (token: IcrcCustomToken) => void;
	setDestinationToken: (token: IcrcCustomToken) => void;
	switchTokens: () => void;
}

export const SWAP_CONTEXT_KEY = Symbol('swap');
