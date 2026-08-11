import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	VeloraSwapMode
} from '$declarations/backend/backend.did';
import { i18n } from '$lib/stores/i18n.store';
import { SwapProvider, VeloraSwapTypes } from '$lib/types/swap';
import type { Token as AppToken } from '$lib/types/token';
import { VELORA_EXTERNAL_REF_KEYS, type VeloraExternalRefKey } from '$lib/types/velora-swap';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import { nonNullish } from '@dfinity/utils';
import { OrderHelpers, type DeltaAuction, type DeltaOrderStatus } from '@velora-dex/sdk';
import { get } from 'svelte/store';

export const isVeloraActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'Velora' in tx.data;

/**
 * The stored execution mode as the string the analytics `swapType` field uses,
 * so a row's terminal `swap_success` / `swap_error` lines up with the
 * `swap_submitted` the wizard fired for the same swap.
 */
export const veloraSwapModeKey = (mode: VeloraSwapMode): VeloraSwapTypes =>
	'Delta' in mode ? VeloraSwapTypes.DELTA : VeloraSwapTypes.MARKET;

/**
 * Builds the `Velora` AUT data variant carrying the mode plus the canonical
 * immutable trio (source token, dest token, source amount in base units). The
 * auction id / order hash / tx hash / nonce and display symbols ride in
 * `external_refs`. Returns `undefined` when either token can't be mapped to a
 * backend `TokenId`.
 */
export const toVeloraData = ({
	mode,
	sourceToken,
	destinationToken,
	amount
}: {
	mode: VeloraSwapMode;
	sourceToken: AppToken;
	destinationToken: AppToken;
	amount: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return { Velora: { mode, source_token, dest_token, amount } };
	}
};

/**
 * Builds a deterministic `(key, value)` external-ref array, dropping empties.
 * Mirrors `toNearIntentsExternalRefs`.
 */
export const toVeloraExternalRefs = (
	refs: Partial<Record<VeloraExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as VeloraExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toVeloraExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<VeloraExternalRefKey, string>> => {
	const map: Partial<Record<VeloraExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as VeloraExternalRefKey] = value;
	}

	return map;
};

/**
 * Snapshots the user-facing fields needed to render an AUT row and to fire its
 * terminal-state analytics events. Uses the same key names as OneSec and NEAR
 * Intents so the UI and analytics code is shared.
 */
export const toVeloraDisplayRefs = ({
	sourceToken,
	destinationToken,
	amount,
	usdSourceValue
}: {
	sourceToken: AppToken;
	destinationToken: AppToken;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<VeloraExternalRefKey, string>> => ({
	[VELORA_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue)
		? { [VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue }
		: {}),
	[VELORA_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: sourceToken.symbol,
	[VELORA_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[VELORA_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: destinationToken.symbol,
	[VELORA_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});

/**
 * Extracts the settlement / refund hashes a Delta order reveals as it
 * progresses, so the poller can persist them for traceability.
 */
export const toVeloraDeltaLearnedRefs = (
	auction: Pick<DeltaAuction, 'transactions' | 'refunds'>
): Partial<Record<VeloraExternalRefKey, string>> => {
	const origin = auction.transactions?.[0]?.originTx;
	const destination = auction.transactions?.[0]?.destinationTx;
	const refund = auction.refunds?.[0]?.tx;

	return {
		...(nonNullish(origin) ? { [VELORA_EXTERNAL_REF_KEYS.ORIGIN_TX_HASH]: origin } : {}),
		...(nonNullish(destination) ? { [VELORA_EXTERNAL_REF_KEYS.DEST_TX_HASH]: destination } : {}),
		...(nonNullish(refund) ? { [VELORA_EXTERNAL_REF_KEYS.REFUND_TX_HASH]: refund } : {})
	};
};

/**
 * Maps a Velora Delta order to the AUT status enum.
 *
 * Built on the SDK's own partitions so that a patch release reclassifying a
 * status carries through here, with three statuses handled explicitly in front
 * of them because they read as terminal to the SDK — or to neither partition —
 * while the order is still moving. AUT terminal states are immutable on the
 * backend, and a terminalized row leaves `activeUserTransactionsPending`, so an
 * early write is irreversible *and* stops the poller from learning anything
 * else about the order:
 *
 * - `SUSPENDED` (in neither partition) means the order cannot currently be
 *   filled — insufficient balance or allowance — and still resolves to
 *   `COMPLETED` or `EXPIRED` on its own.
 * - `CANCELLING` (in neither partition) resolves to `CANCELLED`.
 * - `REFUNDING` sits in the SDK's *failed* partition, and its verdict is indeed
 *   already settled — its only continuation, `REFUNDED`, is also `Failed`. It is
 *   still kept in flight, because terminalizing on the intent to refund buys
 *   nothing and costs two things: the row would claim the swap "was refunded"
 *   before any refund landed, and the poller could never persist the refund hash
 *   that `refunds[]` reveals once it does. Terminalize on `REFUNDED`.
 *
 * Returns `undefined` for an unrecognised status so the poller leaves the row
 * untouched rather than guessing. Bumping `@velora-dex/sdk` requires reviewing
 * this mapper against the current `DeltaOrderStatus` union.
 */
export const toVeloraDeltaStatus = (
	auction: Pick<DeltaAuction, 'status'>
): ActiveUserTransactionStatus | undefined => {
	if (OrderHelpers.checks.isCompletedAuction(auction)) {
		return { Succeeded: null };
	}

	if (
		OrderHelpers.checks.isPendingAuction(auction) ||
		auction.status === 'SUSPENDED' ||
		auction.status === 'CANCELLING' ||
		auction.status === 'REFUNDING'
	) {
		return { Executing: null };
	}

	if (OrderHelpers.checks.isFailedAuction(auction)) {
		return { Failed: null };
	}

	return undefined;
};

export const veloraDeltaStatusError = (status: DeltaOrderStatus): string | undefined => {
	// `REFUNDING` is deliberately absent: it never reaches a `Failed` write, so it
	// never carries an error — see `toVeloraDeltaStatus`.
	if (status === 'REFUNDED') {
		return get(i18n).swap.error.swap_refunded;
	}

	if (status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED') {
		return get(i18n).swap.error.failed_unexpectedly;
	}

	return undefined;
};

/**
 * What the source chain says about a Market swap transaction.
 *
 * `replaced` is a *candidate* verdict, not a conclusion: the receipt read and
 * the nonce read are not atomic, so a successful swap can momentarily look
 * replaced. The poller only terminalizes it after seeing it twice in a row.
 */
export type VeloraMarketOutcome = 'succeeded' | 'reverted' | 'pending' | 'replaced' | 'unknown';

/**
 * Reads a Market swap's outcome off the source chain.
 *
 * `getNonce` signs with the *pending* count, so the transaction owns nonce `N`,
 * while `confirmedNonce` is the sender's next unused *confirmed* nonce. A null
 * receipt with a confirmed count already past `N` means some other transaction
 * consumed slot `N` — a speed-up, a cancel, or a re-broadcast — so ours can
 * never mine.
 */
export const toVeloraMarketOutcome = ({
	receipt,
	confirmedNonce,
	txNonce
}: {
	receipt: { status: number | null } | null;
	confirmedNonce?: number;
	txNonce: number;
}): VeloraMarketOutcome => {
	if (nonNullish(receipt)) {
		if (receipt.status === 1) {
			return 'succeeded';
		}

		if (receipt.status === 0) {
			return 'reverted';
		}

		return 'unknown';
	}

	if (nonNullish(confirmedNonce) && confirmedNonce > txNonce) {
		return 'replaced';
	}

	return 'pending';
};

export const veloraMarketOutcomeToStatus = (
	outcome: VeloraMarketOutcome
): ActiveUserTransactionStatus | undefined => {
	switch (outcome) {
		case 'succeeded':
			return { Succeeded: null };
		case 'reverted':
		case 'replaced':
			return { Failed: null };
		case 'pending':
			return { Executing: null };
		default:
			return undefined;
	}
};

export const veloraMarketOutcomeError = (outcome: VeloraMarketOutcome): string | undefined => {
	if (outcome === 'reverted') {
		return get(i18n).swap.error.failed_unexpectedly;
	}

	if (outcome === 'replaced') {
		return get(i18n).swap.error.swap_replaced_or_dropped;
	}

	return undefined;
};

/**
 * Builds the analytics metadata for a Velora AUT row that has just reached a
 * terminal status. Same shape as `buildNearIntentsSwapTrackingMetadata`, plus
 * the execution mode, resolved entirely off the row's snapshot so it survives
 * refresh/resume.
 */
export const buildVeloraSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toVeloraExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[VELORA_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[VELORA_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.VELORA,
		tokenAmount: refs[VELORA_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		// Snapshotted at commit time, so it matches the `swap_submitted` the wizard
		// fired for the same swap rather than the rate at settlement.
		usdSourceValue: refs[VELORA_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE] ?? '',
		sourceNetwork: refs[VELORA_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[VELORA_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? '',
		...('Velora' in tx.data ? { swapType: veloraSwapModeKey(tx.data.Velora.mode) } : {}),
		...(nonNullish(tx.error[0]) ? { error: tx.error[0] } : {})
	};
};
