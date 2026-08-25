import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import {
	NEAR_INTENTS_BLOCKCHAIN_MAP,
	NEAR_INTENTS_QUOTE_DEADLINE_MS
} from '$lib/constants/swap.constants';
import {
	fetchNearIntentsQuote,
	fetchNearIntentsTokens,
	submitNearIntentsDeposit
} from '$lib/rest/near-intents.rest';
import type { NearIntentsToken } from '$lib/types/near-intents';
import type { NetworkId } from '$lib/types/network';
import type { NearIntentsQuoteParams, SwapMappedResult } from '$lib/types/swap';
import {
	buildNearIntentsQuoteRequest,
	mapNearIntentsQuoteResult,
	resolveNearIntentsSwapAssets
} from '$lib/utils/swap.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

let cachedTokens: NearIntentsToken[] | undefined = undefined;

export const loadNearIntentsTokens = async (): Promise<NearIntentsToken[]> => {
	if (nonNullish(cachedTokens)) {
		return cachedTokens;
	}

	cachedTokens = await fetchNearIntentsTokens();

	return cachedTokens;
};

export const clearNearIntentsTokensCache = (): void => {
	cachedTokens = undefined;
};

// Blockchains whose addresses are not EVM hex: Solana (Base58, case-sensitive) and
// Bitcoin (native asset only, no contract addresses). Only the remaining chains may
// have their contract addresses lowercased.
const NON_EVM_BLOCKCHAINS = new Set(['sol', 'btc']);

const EVM_BLOCKCHAINS = new Set(
	Object.getOwnPropertySymbols(NEAR_INTENTS_BLOCKCHAIN_MAP)
		.map((s) => NEAR_INTENTS_BLOCKCHAIN_MAP[s as NetworkId])
		.filter((b) => !NON_EVM_BLOCKCHAINS.has(b))
);

/**
 * Returns the set of supported token identifiers for NEAR Intents,
 * filtered to only include tokens on blockchains matching the given network IDs.
 *
 * EVM contract addresses are lowercased (hex is case-insensitive).
 * Solana addresses are kept as-is (Base58 is case-sensitive).
 * Native tokens (no contract address) use lowercased symbols.
 */
export const nearIntentsSupportedTokens = async ({
	networkIds
}: {
	networkIds: NetworkId[];
}): Promise<Set<string>> => {
	const tokens = await loadNearIntentsTokens();

	const blockchains = new Set(
		networkIds.reduce<string[]>((acc, id) => {
			const b = NEAR_INTENTS_BLOCKCHAIN_MAP[id];

			if (nonNullish(b)) {
				acc.push(b);
			}

			return acc;
		}, [])
	);

	return tokens.reduce<Set<string>>((acc, { blockchain, contractAddress, symbol }) => {
		if (!blockchains.has(blockchain)) {
			return acc;
		}

		if (nonNullish(contractAddress)) {
			acc.add(EVM_BLOCKCHAINS.has(blockchain) ? contractAddress.toLowerCase() : contractAddress);
		} else {
			acc.add(symbol.toLowerCase());
		}

		return acc;
	}, new Set());
};

export const fetchNearIntentsSwapQuote = async ({
	sourceToken,
	destinationToken,
	amount,
	userAddress,
	recipientAddress,
	slippage
}: NearIntentsQuoteParams): Promise<SwapMappedResult | undefined> => {
	if (!NEAR_INTENTS_SWAP_ENABLED || isNullish(userAddress)) {
		return;
	}

	const nearTokens = await loadNearIntentsTokens();

	const assets = resolveNearIntentsSwapAssets({ nearTokens, sourceToken, destinationToken });

	if (isNullish(assets)) {
		return;
	}

	const quoteResponse = await fetchNearIntentsQuote(
		buildNearIntentsQuoteRequest({
			slippageTolerance: Math.round(Number(slippage) * 100),
			...assets,
			amount,
			userAddress,
			recipientAddress,
			deadlineMs: NEAR_INTENTS_QUOTE_DEADLINE_MS
		})
	);

	return mapNearIntentsQuoteResult(quoteResponse);
};

export const submitNearIntentsDepositTx = async ({
	depositAddress,
	txHash,
	depositMemo
}: {
	depositAddress: string;
	txHash: string;
	depositMemo?: string;
}): Promise<void> => {
	await submitNearIntentsDeposit({
		txHash,
		depositAddress,
		...(depositMemo ? { memo: depositMemo } : {})
	});
};
