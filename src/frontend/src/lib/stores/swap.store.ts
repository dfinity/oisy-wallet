import { nonNullish } from '@dfinity/utils';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

import { exchanges } from '$lib/derived/exchange.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { kongSwapTokensStore } from '$lib/stores/kong-swap-tokens.store';

import type { IcToken } from '$icp/types/ic-token';
import type { Balance } from '$lib/types/balance';
import type { Network, NetworkId } from '$lib/types/network';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { getTokenDisplaySymbol } from '$lib/utils/token.utils';

export interface SwapError {
	variant: 'error' | 'warning' | 'info';
	message: string;
	url?: { url: string; text: string };
}

export interface SwapData {
	sourceToken?: Token;
	destinationToken?: Token;
}

export const initSwapContext = (initialData: SwapData = {}): SwapContext => {
	const swapData = writable<SwapData>(initialData);
	const { update } = swapData;

	// Tokens
	const sourceToken = derived(swapData, ({ sourceToken }) => sourceToken);
	const destinationToken = derived(swapData, ({ destinationToken }) => destinationToken);

	// Metadata
	const sourceTokenId = derived(sourceToken, (token) => token?.id);
	const destinationTokenId = derived(destinationToken, (token) => token?.id);

	const sourceTokenSymbol = derived(sourceToken, (token) => token && getTokenDisplaySymbol(token));
	const destinationTokenSymbol = derived(
		destinationToken,
		(token) => token && getTokenDisplaySymbol(token)
	);

	const sourceTokenStandard = derived(sourceToken, (token) => token?.standard);
	const destinationTokenStandard = derived(destinationToken, (token) => token?.standard);

	const sourceTokenNetworkId = derived(sourceToken, (token) => token?.network.id);
	const destinationTokenNetworkId = derived(destinationToken, (token) => token?.network.id);

	const sourceTokenNetwork = derived(sourceToken, (token) => token?.network);
	const destinationTokenNetwork = derived(destinationToken, (token) => token?.network);

	// Balances
	const sourceTokenBalance = derived(
		[balancesStore, sourceTokenId],
		([$balancesStore, $sourceTokenId]) =>
			$sourceTokenId ? $balancesStore?.[$sourceTokenId]?.data : undefined
	);
	const destinationTokenBalance = derived(
		[balancesStore, destinationTokenId],
		([$balancesStore, $destinationTokenId]) =>
			$destinationTokenId ? $balancesStore?.[$destinationTokenId]?.data : undefined
	);

	// Exchange Rates
	const sourceTokenExchangeRate = derived(
		[exchanges, sourceTokenId],
		([$exchanges, $sourceTokenId]) =>
			$sourceTokenId ? $exchanges?.[$sourceTokenId]?.usd : undefined
	);
	const destinationTokenExchangeRate = derived(
		[exchanges, destinationTokenId],
		([$exchanges, $destinationTokenId]) =>
			$destinationTokenId ? $exchanges?.[$destinationTokenId]?.usd : undefined
	);

	// ICP-only feature
	const isSourceTokenIcrc2 = derived(
		[kongSwapTokensStore, sourceTokenSymbol],
		([$kongSwapTokensStore, $sourceTokenSymbol]) =>
			nonNullish($sourceTokenSymbol) &&
			nonNullish($kongSwapTokensStore?.[$sourceTokenSymbol]) &&
			$kongSwapTokensStore[$sourceTokenSymbol].icrc2 === true
	);

	// Cross-chain check
	const isCrossChainSwap = derived(
		[sourceTokenNetworkId, destinationTokenNetworkId],
		([$sourceNetworkId, $destinationNetworkId]) =>
			nonNullish($sourceNetworkId) &&
			nonNullish($destinationNetworkId) &&
			$sourceNetworkId !== $destinationNetworkId
	);

	// Final context
	return {
		sourceToken,
		destinationToken,

		sourceTokenId,
		destinationTokenId,
		sourceTokenSymbol,
		destinationTokenSymbol,
		sourceTokenStandard,
		destinationTokenStandard,
		sourceTokenNetworkId,
		destinationTokenNetworkId,
		sourceTokenNetwork,
		destinationTokenNetwork,

		sourceTokenBalance,
		destinationTokenBalance,
		sourceTokenExchangeRate,
		destinationTokenExchangeRate,

		isSourceTokenIcrc2,
		isCrossChainSwap,

		setSourceToken: (token: Token) =>
			update((currentState) => ({
				...currentState,
				sourceToken: token
			})),

		setDestinationToken: (token: Token | undefined) =>
			update((currentState) => ({
				...currentState,
				destinationToken: token
			})),

		switchTokens: () =>
			update((currentState) => ({
				sourceToken: currentState.destinationToken,
				destinationToken: currentState.sourceToken
			})),

		failedSwapError: writable<SwapError | undefined>(undefined)
	};
};

export interface SwapContext {
	sourceToken: Readable<Token | IcToken | undefined>;
	destinationToken: Readable<Token | IcToken | undefined>;

	sourceTokenId: Readable<TokenId | undefined>;
	destinationTokenId: Readable<TokenId | undefined>;
	sourceTokenSymbol: Readable<string | undefined>;
	destinationTokenSymbol: Readable<string | undefined>;
	sourceTokenStandard: Readable<TokenStandard | undefined>;
	destinationTokenStandard: Readable<TokenStandard | undefined>;
	sourceTokenNetworkId: Readable<NetworkId | undefined>;
	destinationTokenNetworkId: Readable<NetworkId | undefined>;
	sourceTokenNetwork: Readable<Network | undefined>;
	destinationTokenNetwork: Readable<Network | undefined>;

	sourceTokenBalance: Readable<Balance | undefined>;
	destinationTokenBalance: Readable<Balance | undefined>;
	sourceTokenExchangeRate: Readable<number | undefined>;
	destinationTokenExchangeRate: Readable<number | undefined>;

	isSourceTokenIcrc2: Readable<boolean>;
	isCrossChainSwap: Readable<boolean>;

	setSourceToken: (token: Token) => void;
	setDestinationToken: (token: Token | undefined) => void;
	switchTokens: () => void;

	failedSwapError: Writable<SwapError | undefined>;
}

export const SWAP_CONTEXT_KEY = Symbol('swap');
