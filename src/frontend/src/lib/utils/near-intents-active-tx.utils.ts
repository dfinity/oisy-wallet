import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { i18n } from '$lib/stores/i18n.store';
import {
	NEAR_INTENTS_EXTERNAL_REF_KEYS,
	type NearIntentsExternalRefKey,
	type NearIntentsSwapDetails,
	type NearIntentsSwapStatus
} from '$lib/types/near-intents';
import { SwapProvider } from '$lib/types/swap';
import type { Token as AppToken } from '$lib/types/token';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const isNearIntentsActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'NearIntents' in tx.data;

/**
 * Builds the `NearIntents` AUT data variant carrying the canonical immutable
 * trio (source token, dest token, source amount in base units). The deposit
 * address/memo, tx hashes and display symbols ride in `external_refs`. Returns
 * `undefined` when either token can't be mapped to a backend `TokenId`.
 */
export const toNearIntentsData = ({
	sourceToken,
	destinationToken,
	amount
}: {
	sourceToken: AppToken;
	destinationToken: AppToken;
	amount: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return { NearIntents: { source_token, dest_token, amount } };
	}
};

/**
 * Builds a deterministic `(key, value)` external-ref array, dropping empties.
 * Mirrors `toOneSecExternalRefs`.
 */
export const toNearIntentsExternalRefs = (
	refs: Partial<Record<NearIntentsExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as NearIntentsExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toNearIntentsExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<NearIntentsExternalRefKey, string>> => {
	const map: Partial<Record<NearIntentsExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as NearIntentsExternalRefKey] = value;
	}

	return map;
};

/**
 * Snapshots the user-facing fields needed to render an AUT row and to fire its
 * terminal-state analytics events. Uses the same key names as OneSec so the UI
 * and analytics code is shared. Read back from `tx.external_refs`, so it stays
 * accurate across page refresh / cross-session resume — even when the user has
 * since disabled the underlying token.
 */
export const toNearIntentsDisplayRefs = ({
	sourceToken,
	destinationToken,
	amount
}: {
	sourceToken: AppToken;
	destinationToken: AppToken;
	amount: string;
}): Partial<Record<NearIntentsExternalRefKey, string>> => ({
	[NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	[NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: destinationToken.symbol,
	[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

/**
 * Extracts the newly-learned origin/destination tx hashes from a `/status`
 * response so the poller can persist them for traceability.
 */
export const toNearIntentsLearnedRefs = (
	swapDetails: NearIntentsSwapDetails
): Partial<Record<NearIntentsExternalRefKey, string>> => {
	const origin = swapDetails.originChainTxHashes?.[0]?.hash;
	const destination = swapDetails.destinationChainTxHashes?.[0]?.hash;

	return {
		...(nonNullish(origin) ? { [NEAR_INTENTS_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH]: origin } : {}),
		...(nonNullish(destination)
			? { [NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TX_HASH]: destination }
			: {})
	};
};

/**
 * Maps a 1Click `NearIntentsSwapStatus` to the AUT status enum.
 *
 * The 1Click terminal set is only `SUCCESS` / `REFUNDED` / `FAILED`; everything
 * else is still in flight. Crucially `INCOMPLETE_DEPOSIT` (an underpaid deposit)
 * is treated as in-flight, NOT terminal: it still resolves to `REFUNDED` (or
 * `SUCCESS` if topped up) by the quote deadline, and an early `Failed` write on an
 * AUT row could never be walked back on the backend.
 */
export const toNearIntentsActiveUserTransactionStatus = (
	status: NearIntentsSwapStatus
): ActiveUserTransactionStatus | undefined => {
	switch (status) {
		case 'SUCCESS':
			return { Succeeded: null };
		case 'REFUNDED':
		case 'FAILED':
			return { Failed: null };
		case 'PENDING_DEPOSIT':
		case 'KNOWN_DEPOSIT_TX':
		case 'INCOMPLETE_DEPOSIT':
		case 'PROCESSING':
			return { Executing: null };
		default:
			return undefined;
	}
};

export const nearIntentsStatusError = (status: NearIntentsSwapStatus): string | undefined => {
	if (status === 'REFUNDED') {
		return get(i18n).swap.error.swap_refunded;
	}

	if (status === 'FAILED') {
		return get(i18n).swap.error.failed_unexpectedly;
	}

	return undefined;
};

/**
 * Builds the analytics metadata for a NEAR Intents AUT row that has just reached
 * a terminal status. Same shape as `buildOneSecSwapTrackingMetadata`, resolved
 * entirely off the row's `external_refs` snapshot so it survives refresh/resume.
 */
export const buildNearIntentsSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toNearIntentsExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.NEAR_INTENTS,
		tokenAmount: refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		sourceNetwork: refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[NEAR_INTENTS_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? '',
		...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
	};
};
