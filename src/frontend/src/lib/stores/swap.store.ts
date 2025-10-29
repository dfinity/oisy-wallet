import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { Balance } from '$lib/types/balance';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';
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

type IsTokensIcrc2Map = Record<string, boolean>;

export const initSwapContext = (swapData: SwapData = {}): SwapContext => {
	const data = writable<SwapData>(swapData);
	const { update } = data;
	const isTokensIcrc2 = writable<IsTokensIcrc2Map | undefined>();
	const isErc20PermitSupported = writable<IsTokensIcrc2Map | undefined>();

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

	return {
		sourceToken,
		destinationToken,
		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,
		isSourceTokenIcrc2,
		isSourceTokenPermitSupported,
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
			})),
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
	isSourceTokenIcrc2: Readable<boolean | undefined>;
	isSourceTokenPermitSupported: Readable<boolean | undefined>;
	failedSwapError: Writable<SwapError | undefined>;
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
}

export const SWAP_CONTEXT_KEY = Symbol('swap');
