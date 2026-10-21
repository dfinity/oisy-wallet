import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { exchanges } from '$lib/derived/exchange.derived';
import { swappableTokens } from '$lib/derived/swap.derived';
import { balancesStore } from '$lib/stores/balances.store';
import {
	swapSupportedTokensStore,
	type SwapSupportedTokensData
} from '$lib/stores/swap-supported-tokens.store';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import { computeReceiveSupportedTokens } from '$lib/utils/swap-tokens-filter.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { derived, get, writable, type Readable, type Writable } from 'svelte/store';

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

type IsTokensIcrc2Map = Record<string, boolean>;

export const initSwapContext = (swapData: SwapData = {}): SwapContext => {
	const data = writable<SwapData>(swapData);
	const { update, set } = data;
	const isTokensIcrc2 = writable<IsTokensIcrc2Map | undefined>();
	const isErc20PermitSupported = writable<IsTokensIcrc2Map | undefined>();
	const failedSwapError = writable<SwapError | undefined>(undefined);
	const lifiCarriedFee = writable<LifiCarriedFee | undefined>(undefined);
	// Kept here rather than in the form, which every step change rebuilds: picking a provider or a
	// destination would otherwise release "Max", and the amount would keep the max of a fee that
	// no longer applies.
	const amountSetToMax = writable(false);

	const sourceToken = derived(
		[data, swappableTokens],
		([{ sourceToken }, $swappableTokens]) => sourceToken ?? $swappableTokens.sourceToken
	);
	const destinationToken = derived(
		[data, swappableTokens],
		([{ destinationToken }, $swappableTokens]) =>
			destinationToken ?? $swappableTokens.destinationToken
	);

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
		[isTokensIcrc2, sourceToken],
		([$isTokensIcrc2, $sourceToken]) => {
			if (isNullish($sourceToken) || !isIcToken($sourceToken) || isNullish($isTokensIcrc2)) {
				return;
			}
			return $isTokensIcrc2[$sourceToken.ledgerCanisterId];
		}
	);

	const isSourceTokenPermitSupported = derived(
		[isErc20PermitSupported, sourceToken],
		([$isErc20PermitSupported, $sourceToken]) => {
			if (
				isNullish($sourceToken) ||
				!isTokenErc20($sourceToken) ||
				isNullish($isErc20PermitSupported)
			) {
				return;
			}
			return $isErc20PermitSupported[$sourceToken.address];
		}
	);

	// Aggregated per-provider directed destinations reachable from the current source.
	// Shared by the destination token list, the destination network filter, and the
	// auto-clear effect, so the per-source aggregation runs once per (source, providers) change.
	const receiveSupportedData = derived(
		[sourceToken, swapSupportedTokensStore],
		([$sourceToken, $swapSupportedTokensStore]) =>
			nonNullish($sourceToken) && nonNullish($swapSupportedTokensStore)
				? computeReceiveSupportedTokens({
						sourceToken: $sourceToken,
						providers: $swapSupportedTokensStore.providers
					})
				: undefined
	);

	return {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		isSourceTokenIcrc2,
		isSourceTokenPermitSupported,
		receiveSupportedData,
		failedSwapError,
		lifiCarriedFee,
		amountSetToMax,
		// The amount is kept as it is for another source, not refilled with that token's max.
		setSourceToken: (token: Token) => {
			amountSetToMax.set(false);

			update((state) => ({
				...state,
				sourceToken: token
			}));
		},
		setDestinationToken: (token: Token | undefined) =>
			update((state) => ({
				...state,
				destinationToken: token
			})),
		// TODO: Ideally, this function should be used with reactive statements, exported outside the store.
		switchTokens: () => {
			amountSetToMax.set(false);

			update((state) => {
				const $swappableTokens = get(swappableTokens);

				return {
					...state,
					sourceToken: state.destinationToken ?? $swappableTokens.destinationToken,
					destinationToken: state.sourceToken ?? $swappableTokens.sourceToken
				};
			});
		},
		setIsTokensIcrc2: ({
			ledgerCanisterId,
			isIcrc2Supported
		}: {
			ledgerCanisterId: string;
			isIcrc2Supported: boolean;
		}) =>
			isTokensIcrc2.update((state) => ({
				...state,
				[ledgerCanisterId]: isIcrc2Supported
			})),
		setIsTokenPermitSupported: ({
			address,
			isPermitSupported
		}: {
			address: string;
			isPermitSupported: boolean;
		}) =>
			isErc20PermitSupported.update((state) => ({
				...state,
				[address]: isPermitSupported
			})),

		reset: () => {
			set({
				sourceToken: undefined,
				destinationToken: undefined
			});
			failedSwapError.set(undefined);
			lifiCarriedFee.set(undefined);
			amountSetToMax.set(false);
		}
	};
};

// The gas and L1 data fee of a LI.FI fee ceiling that an execution found above the reviewed one,
// for the quote inputs it was found for; the review prices them at its own fee per gas. Kept here
// rather than in the wizard, which every step change rebuilds: the review the failed execution
// returns to is another instance.
export interface LifiCarriedFee {
	key: string;
	gas: bigint;
	l1Fee: bigint;
}

export interface SwapContext {
	sourceToken: Readable<Token | undefined>;
	destinationToken: Readable<Token | undefined>;
	sourceTokenBalance: Readable<Balance | undefined>;
	destinationTokenBalance: Readable<Balance | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;
	isSourceTokenIcrc2: Readable<boolean | undefined>;
	isSourceTokenPermitSupported: Readable<boolean | undefined>;
	receiveSupportedData: Readable<SwapSupportedTokensData | undefined>;
	failedSwapError: Writable<SwapError | undefined>;
	lifiCarriedFee: Writable<LifiCarriedFee | undefined>;
	// Whether "Max" holds the source amount, re-applied whenever the fee changes until the user
	// types or the source changes.
	amountSetToMax: Writable<boolean>;
	setIsTokensIcrc2: (args: { ledgerCanisterId: string; isIcrc2Supported: boolean }) => void;
	setIsTokenPermitSupported: ({
		address,
		isPermitSupported
	}: {
		address: string;
		isPermitSupported: boolean;
	}) => void;
	setSourceToken: (token: Token) => void;
	setDestinationToken: (token: Token | undefined) => void;
	switchTokens: () => void;
	reset: () => void;
}

export const SWAP_CONTEXT_KEY = Symbol('swap');
