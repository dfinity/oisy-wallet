import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

export interface SwapError {
	variant: 'error' | 'warning' | 'info';
	message: string;
	url?: { url: string; text: string };
	errorType?: string;
	swapSucceded?: boolean;
}

export interface SwapData {
	sourceToken?: Token;
	destinationToken?: Token;
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

	const isSourceTokenIcrc2 = derived(
		[kongSwapTokensStore, sourceToken],
		([$kongSwapTokensStore, $sourceToken]) =>
			nonNullish($sourceToken) &&
			nonNullish($kongSwapTokensStore) &&
			nonNullish($kongSwapTokensStore[$sourceToken.symbol]) &&
			$kongSwapTokensStore[$sourceToken.symbol].icrc2
	);

	return {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		isSourceTokenIcrc2,
		failedSwapError: writable<SwapError | undefined>(undefined),
		setSourceToken: (token: Token) =>
			update((state) => ({
				...state,
				sourceToken: token
			})),
		setDestinationToken: (token: Token | undefined) =>
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
	sourceToken: Readable<Token | undefined>;
	destinationToken: Readable<Token | undefined>;
	sourceTokenBalance: Readable<Balance | undefined>;
	destinationTokenBalance: Readable<Balance | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;
	isSourceTokenIcrc2: Readable<boolean>;
	failedSwapError: Writable<SwapError | undefined>;
	setSourceToken: (token: Token) => void;
	setDestinationToken: (token: Token | undefined) => void;
	switchTokens: () => void;
}

export const SWAP_CONTEXT_KEY = Symbol('swap');
