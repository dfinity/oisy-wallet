import type {
	ActiveUserTransaction,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	TokenId
} from '$declarations/backend/backend.did';
import {
	ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES,
	ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES
} from '$lib/constants/app.constants';
import {
	LIFI_STATUS_POLL_CADENCE,
	LIFI_STATUS_POLL_SLOWEST_INTERVAL_MILLIS,
	LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS
} from '$lib/constants/swap.constants';
import { i18n } from '$lib/stores/i18n.store';
import { LIFI_EXTERNAL_REF_KEYS, type LifiExternalRefKey } from '$lib/types/lifi';
import { SwapProvider } from '$lib/types/swap';
import type { EvmSourceTxOutcome } from '$lib/utils/evm-source-tx.utils';
import { formatToken } from '$lib/utils/format.utils';
import { truncateUtf8Bytes } from '$lib/utils/string.utils';
import { isNullish, notEmptyString } from '@dfinity/utils';
import {
	ChainId,
	type BaseStatusData,
	type ExtendedTransactionInfo,
	type PendingReceivingInfo
} from '@lifi/sdk';
import { get } from 'svelte/store';

export const isLifiActiveUserTransaction = (tx: ActiveUserTransaction): boolean =>
	'Lifi' in tx.data;

/**
 * Builds a deterministic `(key, value)` external-ref array, dropping empties.
 * Mirrors `toVeloraExternalRefs`.
 */
export const toLifiExternalRefs = (
	refs: Partial<Record<LifiExternalRefKey, string>>
): ActiveUserTransactionRef[] =>
	(Object.keys(refs) as LifiExternalRefKey[])
		.filter((key) => refs[key] !== undefined && refs[key] !== '')
		.sort()
		.map((key) => ({ key, value: refs[key] as string }));

// Wire-format `(key, value)` array → keyed lookup.
export const toLifiExternalRefsMap = (
	refs: ActiveUserTransactionRef[]
): Partial<Record<LifiExternalRefKey, string>> => {
	const map: Partial<Record<LifiExternalRefKey, string>> = {};

	for (const { key, value } of refs) {
		map[key as LifiExternalRefKey] = value;
	}

	return map;
};

/**
 * The LI.FI chain id of a row's token: the row's `source_token` / `dest_token` carry the chain, so
 * the refs hold none. `undefined` outside LI.FI's v1 matrix, which the backend refuses to store.
 */
export const lifiChainIdOfTokenId = (tokenId: TokenId): number | undefined => {
	if ('EvmNative' in tokenId) {
		return Number(tokenId.EvmNative);
	}

	if ('Erc20' in tokenId) {
		return Number(tokenId.Erc20[1]);
	}

	if ('Erc4626' in tokenId) {
		return Number(tokenId.Erc4626[1]);
	}

	if ('SplMainnet' in tokenId || 'SolNativeMainnet' in tokenId) {
		return ChainId.SOL;
	}
};

/**
 * How often a row is polled, by its age: LI.FI's recommended cadence. The age is read off the
 * canister's creation time, so clock skew can only shift the cadence, never a verdict.
 */
export const lifiStatusPollIntervalMillis = (ageMillis: number): number =>
	LIFI_STATUS_POLL_CADENCE.find(({ maxAgeMillis }) => ageMillis < maxAgeMillis)?.intervalMillis ??
	LIFI_STATUS_POLL_SLOWEST_INTERVAL_MILLIS;

export interface LifiStatusUpdate {
	status: ActiveUserTransactionStatus;
	// Written with a `Failed` status only.
	error?: string;
}

/**
 * The row's status while its EVM source transaction is not confirmed yet, from the source chain's
 * verdict. A confirmed source settles nothing: from there, `/status` decides.
 */
export const lifiSourceOutcomeToUpdate = (
	outcome: EvmSourceTxOutcome
): LifiStatusUpdate | undefined => {
	switch (outcome) {
		case 'pending':
			return { status: { Executing: null } };
		case 'reverted':
			return { status: { Failed: null }, error: get(i18n).swap.error.failed_unexpectedly };
		case 'replaced':
			return { status: { Failed: null }, error: get(i18n).swap.error.swap_replaced_or_dropped };
		default:
			return undefined;
	}
};

// A `/status` answer, or the `NOT_FOUND` an HTTP 404 stands for.
export type LifiStatusAnswer = BaseStatusData & {
	receiving?: PendingReceivingInfo | ExtendedTransactionInfo;
};

// LI.FI does not know the transfer (yet), or cannot tie its hash to the bridge or chains asked about.
export const isLifiStatusUnresolved = ({ status }: Pick<LifiStatusAnswer, 'status'>): boolean =>
	status === 'NOT_FOUND' || status === 'INVALID';

/**
 * Maps a `/status` answer to the status it moves the row to. `undefined` for an unresolved answer,
 * whose bound the poller keeps, and for a status this mapper does not know, so that the row is left
 * untouched rather than guessed at.
 *
 * `DONE` / `PARTIAL` is a success: the user received full value, only in another token, which the
 * learned refs record. `DONE` / `REFUNDED` is a failure: the swap did not happen, though the funds
 * are back. A `FAILED` row keeps LI.FI's own reason for support; it is stored, never shown.
 */
export const toLifiStatusUpdate = ({
	status,
	substatus,
	substatusMessage
}: LifiStatusAnswer): LifiStatusUpdate | undefined => {
	if (status === 'PENDING') {
		return { status: { Executing: null } };
	}

	if (status === 'DONE') {
		return substatus === 'REFUNDED'
			? { status: { Failed: null }, error: get(i18n).swap.error.swap_refunded }
			: { status: { Succeeded: null } };
	}

	if (status === 'FAILED') {
		return {
			status: { Failed: null },
			error: notEmptyString(substatusMessage)
				? truncateUtf8Bytes({
						text: substatusMessage,
						maxBytes: ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES
					})
				: get(i18n).swap.error.failed_unexpectedly
		};
	}
};

const EVM_TX_HASH = /^0x[\da-fA-F]{64}$/;
const SOLANA_SIGNATURE = /^[1-9A-HJ-NP-Za-km-z]{64,88}$/;

// 78 digits cover the whole unsigned 256-bit range.
const RECEIVED_AMOUNT = /^\d{1,78}$/;
const RECEIVED_DECIMALS_MAX = 36;

/**
 * The token the user actually received, as `lifi_received_symbol` / `lifi_received_amount`, the
 * amount formatted so that the token's decimals need not be stored too. LI.FI's metadata is
 * untrusted and optional: the length is checked before any `BigInt` or `formatToken` call, and
 * when any check fails the pair is omitted, so the row shows the target token, as for `COMPLETED`.
 */
const toLifiReceivedRefs = ({
	amount,
	token
}: Pick<ExtendedTransactionInfo, 'amount' | 'token'>): Partial<
	Record<LifiExternalRefKey, string>
> => {
	if (
		isNullish(amount) ||
		!RECEIVED_AMOUNT.test(amount) ||
		isNullish(token) ||
		!Number.isInteger(token.decimals) ||
		token.decimals < 0 ||
		token.decimals > RECEIVED_DECIMALS_MAX ||
		!notEmptyString(token.symbol)
	) {
		return {};
	}

	try {
		const formatted = formatToken({ value: BigInt(amount), unitName: token.decimals });

		// An amount cut short would be wrong rather than shorter. It is ASCII, so its length is its
		// byte count.
		if (formatted.length > ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES) {
			return {};
		}

		return {
			[LIFI_EXTERNAL_REF_KEYS.RECEIVED_SYMBOL]: truncateUtf8Bytes({
				text: token.symbol,
				maxBytes: ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES
			}),
			[LIFI_EXTERNAL_REF_KEYS.RECEIVED_AMOUNT]: formatted
		};
	} catch (_: unknown) {
		return {};
	}
};

/**
 * The refs a `/status` answer teaches: the destination tx hash once LI.FI reports one, and on
 * `DONE` / `PARTIAL` the token the user actually received. A hash that is not one for the
 * destination chain is omitted rather than stored.
 */
export const toLifiLearnedRefs = ({
	answer: { status, substatus, receiving },
	toChain
}: {
	answer: LifiStatusAnswer;
	toChain: number;
}): Partial<Record<LifiExternalRefKey, string>> => {
	if (isNullish(receiving) || !('txHash' in receiving)) {
		return {};
	}

	const { txHash } = receiving;

	const isDestinationHash = (toChain === ChainId.SOL ? SOLANA_SIGNATURE : EVM_TX_HASH).test(txHash);

	return {
		...(isDestinationHash ? { [LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: txHash } : {}),
		...(status === 'DONE' && substatus === 'PARTIAL' ? toLifiReceivedRefs(receiving) : {})
	};
};

/**
 * Observed time during which `/status` stayed unresolved after the row's source was confirmed, as
 * the browser saw it. Kept per row in `localStorage`, so that a reload does not restart it.
 */
export interface LifiUnresolvedWindow {
	elapsedMs: number;
	lastSeenAt: number;
}

// The window is read back from `localStorage`, which anything on the origin can write.
export const isLifiUnresolvedWindow = (value: unknown): value is LifiUnresolvedWindow => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const { elapsedMs, lastSeenAt } = value as Partial<Record<keyof LifiUnresolvedWindow, unknown>>;

	return (
		typeof elapsedMs === 'number' &&
		Number.isFinite(elapsedMs) &&
		elapsedMs >= 0 &&
		typeof lastSeenAt === 'number' &&
		Number.isFinite(lastSeenAt)
	);
};

/**
 * The window after one more poll that sees `/status` unresolved with the source confirmed. The first
 * one opens it at zero; each later one adds the time since the previous, clamped to
 * `[0, LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS]`. Accumulated rather than `now − start`, so that a
 * clock jump, or a tab left closed, can only delay the verdict, never hasten it.
 */
export const nextLifiUnresolvedWindow = ({
	window,
	now
}: {
	window: LifiUnresolvedWindow | undefined;
	now: number;
}): LifiUnresolvedWindow => ({
	elapsedMs: isNullish(window)
		? 0
		: window.elapsedMs +
			Math.min(Math.max(now - window.lastSeenAt, 0), LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS),
	lastSeenAt: now
});

/**
 * Builds the analytics metadata for a LI.FI row that has just reached a terminal status: the same
 * shape as the other swap providers', resolved off the row's snapshot so it survives refresh /
 * resume. Without the row's error, unlike theirs: for a `FAILED` transfer it is LI.FI's own text,
 * which never goes to analytics (invariant 4 in `docs/ai/frontend/analytics.md`).
 */
export const buildLifiSwapTrackingMetadata = ({
	tx
}: {
	tx: ActiveUserTransaction;
}): Record<string, string> => {
	const refs = toLifiExternalRefsMap(tx.external_refs);

	return {
		sourceToken: refs[LIFI_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL] ?? '',
		destinationToken: refs[LIFI_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL] ?? '',
		dApp: SwapProvider.LIFI,
		tokenAmount: refs[LIFI_EXTERNAL_REF_KEYS.AMOUNT] ?? '',
		usdSourceValue: refs[LIFI_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE] ?? '',
		sourceNetwork: refs[LIFI_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL] ?? '',
		destinationNetwork: refs[LIFI_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL] ?? ''
	};
};
