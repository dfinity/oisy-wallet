import { NEAR_INTENTS_SWAP_ENABLED } from '$env/rest/near-intents.env';
import {
	NEAR_INTENTS_BLOCKCHAIN_MAP,
	NEAR_INTENTS_BTC_QUOTE_DEADLINE_MS,
	NEAR_INTENTS_QUOTE_DEADLINE_MS
} from '$lib/constants/swap.constants';
import {
	fetchNearIntentsQuote,
	fetchNearIntentsTokens,
	NEAR_INTENTS_QUOTE_ERROR_PREFIX,
	submitNearIntentsDeposit
} from '$lib/rest/near-intents.rest';
import { SwapAmountTooLowError } from '$lib/types/errors';
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
import { nativeSwapTokenIdentifier } from '$lib/utils/swap-tokens-filter.utils';
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

// 1Click restricts some chains to swaps above a fiat floor ($1,000 on Polygon and BSC at
// the time of writing), on either side of the route, and exposes the figure only in the
// refusal message. A one-unit dry quote provokes that refusal without committing to
// anything: the limit is checked before the recipient and refund addresses are validated,
// so placeholder addresses are enough and the probe needs neither the user's addresses nor
// a plausible amount.
//
// If 1Click ever validates addresses first, every probe reads as unrestricted and the hint
// stops appearing — the reactive refusal still names the limit, so that fails safe.
const NEAR_INTENTS_LIMIT_PROBE_ADDRESS = 'oisy-swap-limit-probe';
const NEAR_INTENTS_LIMIT_PROBE_AMOUNT = 1n;
const NEAR_INTENTS_LIMIT_PROBE_SLIPPAGE = 100;

// A refusal that is not the fiat limit proves both probed chains are unrestricted, so it is
// remembered per chain. The limit itself proves only that one of the two sides is
// restricted, not which, so that verdict is remembered against the pair. A pair whose chains
// are both already known unrestricted needs no probe, which is what stops this from being a
// request per pair selection.
const unrestrictedBlockchains = new Set<string>();
const restrictedPairLimits = new Map<string, number>();

const restrictionPairKey = (blockchains: [string, string]): string =>
	[...blockchains].sort().join('<->');

export const clearNearIntentsSwapLimitCache = (): void => {
	unrestrictedBlockchains.clear();
	restrictedPairLimits.clear();
};

/**
 * The fiat floor 1Click imposes on a token pair, in USD, or `undefined` when the pair has
 * none, when the pair is not routable through NEAR Intents, or when the probe could not
 * reach a verdict.
 *
 * `undefined` is deliberately not distinguished from "not yet known": the caller shows a
 * hint or shows nothing, and a swap is never blocked on this answer.
 */
export const fetchNearIntentsSwapLimit = async ({
	sourceToken,
	destinationToken
}: Pick<NearIntentsQuoteParams, 'sourceToken' | 'destinationToken'>): Promise<
	number | undefined
> => {
	if (!NEAR_INTENTS_SWAP_ENABLED) {
		return;
	}

	const nearTokens = await loadNearIntentsTokens();

	const assets = resolveNearIntentsSwapAssets({ nearTokens, sourceToken, destinationToken });

	if (isNullish(assets)) {
		return;
	}

	const { srcAsset, destAsset } = assets;

	const blockchains: [string, string] = [srcAsset.blockchain, destAsset.blockchain];

	const cachedLimit = restrictedPairLimits.get(restrictionPairKey(blockchains));

	if (nonNullish(cachedLimit)) {
		return cachedLimit;
	}

	if (blockchains.every((blockchain) => unrestrictedBlockchains.has(blockchain))) {
		return;
	}

	const rememberUnrestricted = () => {
		blockchains.forEach((blockchain) => unrestrictedBlockchains.add(blockchain));
	};

	try {
		await fetchNearIntentsQuote({
			...buildNearIntentsQuoteRequest({
				slippageTolerance: NEAR_INTENTS_LIMIT_PROBE_SLIPPAGE,
				srcAsset,
				destAsset,
				amount: NEAR_INTENTS_LIMIT_PROBE_AMOUNT,
				userAddress: NEAR_INTENTS_LIMIT_PROBE_ADDRESS,
				recipientAddress: NEAR_INTENTS_LIMIT_PROBE_ADDRESS,
				deadlineMs: NEAR_INTENTS_QUOTE_DEADLINE_MS
			}),
			dry: true
		});

		// Implausible at one unit, but a quote is still proof there is no floor above it.
		rememberUnrestricted();
	} catch (err: unknown) {
		if (err instanceof SwapAmountTooLowError && err.minimum?.type === 'usd') {
			restrictedPairLimits.set(restrictionPairKey(blockchains), err.minimum.value);

			return err.minimum.value;
		}

		// Only a refusal is evidence. A transport failure says nothing about the route, so it
		// is not cached either way and the next pair selection retries.
		if (err instanceof Error && err.message.startsWith(NEAR_INTENTS_QUOTE_ERROR_PREFIX)) {
			rememberUnrestricted();
		}
	}
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
 * Native tokens (no contract address) are keyed by {@link nativeSwapTokenIdentifier}, which
 * qualifies the symbol with the network — 1Click lists a native ETH per EVM chain, and a
 * bare `'eth'` would collapse all of them into one entry the filter cannot tell apart.
 */
export const nearIntentsSupportedTokens = async ({
	networkIds
}: {
	networkIds: NetworkId[];
}): Promise<Set<string>> => {
	const tokens = await loadNearIntentsTokens();

	// The map is injective, so the inverse is a plain lookup: one network per blockchain.
	const blockchainNetworkIds = networkIds.reduce<Map<string, NetworkId>>((acc, id) => {
		const b = NEAR_INTENTS_BLOCKCHAIN_MAP[id];

		return nonNullish(b) ? acc.set(b, id) : acc;
	}, new Map());

	return tokens.reduce<Set<string>>((acc, { blockchain, contractAddress, symbol }) => {
		const networkId = blockchainNetworkIds.get(blockchain);

		if (isNullish(networkId)) {
			return acc;
		}

		if (nonNullish(contractAddress)) {
			acc.add(EVM_BLOCKCHAINS.has(blockchain) ? contractAddress.toLowerCase() : contractAddress);
		} else {
			acc.add(nativeSwapTokenIdentifier({ networkId, symbol }));
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
