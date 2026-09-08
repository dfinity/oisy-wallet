import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import {
	NEAR_INTENTS_BLOCKCHAIN_MAP,
	NEAR_INTENTS_BTC_QUOTE_DEADLINE_MS,
	NEAR_INTENTS_QUOTE_DEADLINE_MS
} from '$lib/constants/swap.constants';
import {
	fetchNearIntentsQuote,
	fetchNearIntentsTokens,
	submitNearIntentsDeposit
} from '$lib/rest/near-intents.rest';
import type {
	NearIntentsQuoteRequest,
	NearIntentsQuoteResponse,
	NearIntentsToken
} from '$lib/types/near-intents';
import type { NetworkId } from '$lib/types/network';
import type { NearIntentsQuoteParams, SwapMappedResult } from '$lib/types/swap';
import {
	findNearIntentsQuoteRequestMismatch,
	isNearIntentsQuoteExpired,
	verifyNearIntentsQuoteSignature
} from '$lib/utils/near-intents-quote.utils';
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
// Bitcoin (1Click may list btc assets with a contractAddress, and those identifiers
// are not case-insensitive hex). Only the remaining chains may have their contract
// addresses lowercased.
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

/**
 * Rejects a quote the 1Click service did not demonstrably issue for this request.
 *
 * The quote names the address the wallet then irreversibly sends the swap amount to, so it
 * is authenticated before it can reach the UI: the signature proves the service issued it,
 * the echoed request proves it was issued for us rather than replayed from someone else's
 * quote, and the signed deadline proves it is not a captured quote whose deposit address
 * has gone stale. Callers reach this through `Promise.allSettled`, so a rejection drops the
 * NEAR Intents option instead of surfacing an unverified deposit address.
 */
const assertNearIntentsQuoteAuthentic = async ({
	sent,
	response
}: {
	sent: NearIntentsQuoteRequest;
	response: NearIntentsQuoteResponse;
}): Promise<void> => {
	if (!(await verifyNearIntentsQuoteSignature(response))) {
		throw new Error('NEAR Intents quote signature verification failed');
	}

	const mismatch = findNearIntentsQuoteRequestMismatch({ sent, echoed: response.quoteRequest });

	if (nonNullish(mismatch)) {
		throw new Error(`NEAR Intents quote does not match the request: ${mismatch}`);
	}

	if (isNearIntentsQuoteExpired(response)) {
		throw new Error('NEAR Intents quote is past the window it was signed for');
	}
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

	// A BTC deposit needs a much longer window to confirm on-chain before the 1Click
	// deadline triggers a refund; see the constants for the rationale.
	const deadlineMs =
		assets.srcAsset.blockchain === 'btc'
			? NEAR_INTENTS_BTC_QUOTE_DEADLINE_MS
			: NEAR_INTENTS_QUOTE_DEADLINE_MS;

	const quoteRequest = buildNearIntentsQuoteRequest({
		slippageTolerance: Math.round(Number(slippage) * 100),
		...assets,
		amount,
		userAddress,
		recipientAddress,
		deadlineMs
	});

	const quoteResponse = await fetchNearIntentsQuote(quoteRequest);

	await assertNearIntentsQuoteAuthentic({ sent: quoteRequest, response: quoteResponse });

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
