import type {
	ActiveUserTransaction,
	ActiveUserTransactionData,
	ActiveUserTransactionRef,
	ActiveUserTransactionStatus,
	TokenId
} from '$declarations/backend/backend.did';
import {
	ACTIVE_USER_TRANSACTION_ERROR_MAX_BYTES,
	ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES,
	MAX_UINT_64
} from '$lib/constants/app.constants';
import {
	LIFI_STATUS_POLL_CADENCE,
	LIFI_STATUS_POLL_SLOWEST_INTERVAL_MILLIS,
	LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS
} from '$lib/constants/swap.constants';
import { i18n } from '$lib/stores/i18n.store';
import { LIFI_EXTERNAL_REF_KEYS, type LifiExternalRefKey } from '$lib/types/lifi';
import { SwapProvider } from '$lib/types/swap';
import type { Token } from '$lib/types/token';
import type { EvmSourceTxOutcome } from '$lib/utils/evm-source-tx.utils';
import { formatToken } from '$lib/utils/format.utils';
import { truncateUtf8Bytes } from '$lib/utils/string.utils';
import { toBackendTokenId } from '$lib/utils/token-id.utils';
import type { SolSourceTxOutcome } from '$sol/utils/sol-source-tx.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';
import {
	ChainId,
	isSubstatusDone,
	type BaseStatusData,
	type ExtendedTransactionInfo,
	type LiFiStep,
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
 * The row's status while its source transaction is not confirmed yet, from the source chain's
 * verdict (EVM or Solana). A confirmed source settles a same-chain swap, which the poller writes,
 * and nothing else: from there, `/status` decides.
 */
export const lifiSourceOutcomeToUpdate = (
	outcome: EvmSourceTxOutcome | SolSourceTxOutcome
): LifiStatusUpdate | undefined => {
	switch (outcome) {
		case 'pending':
			return { status: { Executing: null } };
		case 'reverted':
			return { status: { Failed: null }, error: get(i18n).swap.error.failed_unexpectedly };
		case 'replaced':
			return { status: { Failed: null }, error: get(i18n).swap.error.swap_replaced_or_dropped };
		case 'expired':
			return { status: { Failed: null }, error: get(i18n).swap.error.swap_expired };
		default:
			return undefined;
	}
};

/**
 * The slot a Solana row stores (`lifi_simulation_slot`), where OISY's own simulation of the signed
 * bytes ran and their blockhash was valid. `undefined` when the row has none or it is not a slot:
 * a `u64`, as the node parses `minContextSlot`, which would refuse a wider one on every poll rather
 * than let the row be read unanchored.
 */
export const toLifiSimulationSlot = (value: string | undefined): bigint | undefined => {
	// The length is checked first, so that an unbounded string never reaches `BigInt`.
	if (isNullish(value) || !/^\d{1,20}$/.test(value)) {
		return undefined;
	}

	const slot = BigInt(value);

	return slot <= MAX_UINT_64 ? slot : undefined;
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
 * The refs a `/status` answer teaches: how a `DONE` transfer ended, the destination tx hash once
 * LI.FI reports one, and on `DONE` / `PARTIAL` the token the user actually received. A hash that is
 * not one for the destination chain is omitted rather than stored.
 *
 * The substatus is recorded on its own, from LI.FI's closed set, so that a partial payout is known
 * even when the received token's metadata fails its checks and is left out.
 */
export const toLifiLearnedRefs = ({
	answer: { status, substatus, receiving },
	toChain
}: {
	answer: LifiStatusAnswer;
	toChain: number;
}): Partial<Record<LifiExternalRefKey, string>> => {
	const outcomeRefs =
		status === 'DONE' && nonNullish(substatus) && isSubstatusDone(substatus)
			? { [LIFI_EXTERNAL_REF_KEYS.SUBSTATUS]: substatus }
			: {};

	if (isNullish(receiving) || !('txHash' in receiving)) {
		return outcomeRefs;
	}

	const { txHash } = receiving;

	const isDestinationHash = (toChain === ChainId.SOL ? SOLANA_SIGNATURE : EVM_TX_HASH).test(txHash);

	return {
		...outcomeRefs,
		...(isDestinationHash ? { [LIFI_EXTERNAL_REF_KEYS.DEST_TX_HASH]: txHash } : {}),
		...(status === 'DONE' && substatus === 'PARTIAL' ? toLifiReceivedRefs(receiving) : {})
	};
};

/**
 * Observed time during which `/status` stayed unresolved after the row's source was confirmed.
 * `lastSeenAt` is a reading of the page's monotonic clock (`performance.now()`), which a change of
 * the system clock does not move; it means nothing in another session.
 */
export interface LifiUnresolvedWindow {
	elapsedMs: number;
	lastSeenAt: number;
}

// What `localStorage` keeps across reloads: the elapsed time alone.
export type LifiStoredUnresolvedWindow = Pick<LifiUnresolvedWindow, 'elapsedMs'>;

// The stored window is read back from `localStorage`, which anything on the origin can write.
export const isLifiStoredUnresolvedWindow = (
	value: unknown
): value is LifiStoredUnresolvedWindow => {
	if (typeof value !== 'object' || value === null) {
		return false;
	}

	const { elapsedMs } = value as Partial<Record<keyof LifiStoredUnresolvedWindow, unknown>>;

	return typeof elapsedMs === 'number' && Number.isFinite(elapsedMs) && elapsedMs >= 0;
};

/**
 * The window after one more poll that sees `/status` unresolved with the source confirmed, `now`
 * read off the monotonic clock. The first poll opens it at zero, and the first after a reload
 * resumes the stored time without adding to it; each later one adds the time since the previous,
 * at most `LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS`. A change of the system clock adds nothing, and
 * a tab left closed or hidden at most one step, so neither can hasten the verdict.
 */
export const nextLifiUnresolvedWindow = ({
	window,
	now
}: {
	window: LifiUnresolvedWindow | LifiStoredUnresolvedWindow | undefined;
	now: number;
}): LifiUnresolvedWindow => ({
	elapsedMs: isNullish(window)
		? 0
		: window.elapsedMs +
			('lastSeenAt' in window
				? Math.min(Math.max(now - window.lastSeenAt, 0), LIFI_STATUS_UNRESOLVED_MAX_STEP_MILLIS)
				: 0),
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

/**
 * The row's data for a LI.FI swap, or `undefined` for a token without a backend `TokenId`; the
 * backend still refuses a pair outside LI.FI's v1 matrix.
 */
export const toLifiData = ({
	sourceToken,
	destinationToken,
	amount
}: {
	sourceToken: Token;
	destinationToken: Token;
	amount: bigint;
}): ActiveUserTransactionData | undefined => {
	const source_token = toBackendTokenId(sourceToken);
	const dest_token = toBackendTokenId(destinationToken);

	if (nonNullish(source_token) && nonNullish(dest_token)) {
		return { Lifi: { source_token, dest_token, amount } };
	}
};

// A cut tool key or transaction id would be wrong rather than shorter, and an oversized one would
// make the backend refuse the row, so a value that fails is left out instead.
const LIFI_TOOL_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const LIFI_TRANSACTION_ID_PATTERN = /^0x[0-9a-fA-F]{1,128}$/;

/**
 * The refs a LI.FI row is created with: the poll keys of its signed source transaction, the route's
 * tool (sent as `bridge` to `/status`) and LI.FI's transaction id when they are valid, and the
 * display metadata every swap provider shares.
 *
 * Besides its hash or signature, an EVM source transaction is polled by the nonce it was signed with,
 * a Solana one by its recent blockhash and the slot OISY simulated it at, where that blockhash was
 * valid. A Solana row without that slot is polled all the same, its blockhash read unanchored.
 */
export const toLifiCreationRefs = ({
	hash,
	source,
	quote: { tool, transactionId },
	sourceToken,
	destinationToken,
	amount,
	usdSourceValue
}: {
	hash: string;
	source: { nonce: number } | { blockhash: string; simulationSlot?: bigint };
	quote: Pick<LiFiStep, 'tool' | 'transactionId'>;
	sourceToken: Token;
	destinationToken: Token;
	amount: string;
	usdSourceValue?: string;
}): Partial<Record<LifiExternalRefKey, string>> => ({
	[LIFI_EXTERNAL_REF_KEYS.TX_HASH]: hash,
	...('nonce' in source
		? { [LIFI_EXTERNAL_REF_KEYS.TX_NONCE]: `${source.nonce}` }
		: {
				[LIFI_EXTERNAL_REF_KEYS.BLOCKHASH]: source.blockhash,
				...(nonNullish(source.simulationSlot) && {
					[LIFI_EXTERNAL_REF_KEYS.SIMULATION_SLOT]: `${source.simulationSlot}`
				})
			}),
	...(LIFI_TOOL_PATTERN.test(tool) && { [LIFI_EXTERNAL_REF_KEYS.TOOL]: tool }),
	...(nonNullish(transactionId) &&
		LIFI_TRANSACTION_ID_PATTERN.test(transactionId) && {
			[LIFI_EXTERNAL_REF_KEYS.TRANSACTION_ID]: transactionId
		}),
	[LIFI_EXTERNAL_REF_KEYS.AMOUNT]: amount,
	...(nonNullish(usdSourceValue) && { [LIFI_EXTERNAL_REF_KEYS.USD_SOURCE_VALUE]: usdSourceValue }),
	// A custom token's symbol has no bound, and a ref over the backend's limit refuses the row, and
	// with it the swap, after its approval was paid.
	[LIFI_EXTERNAL_REF_KEYS.SOURCE_TOKEN_SYMBOL]: truncateUtf8Bytes({
		text: sourceToken.symbol,
		maxBytes: ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES
	}),
	[LIFI_EXTERNAL_REF_KEYS.SOURCE_NETWORK_SYMBOL]: sourceToken.network.name,
	[LIFI_EXTERNAL_REF_KEYS.DESTINATION_TOKEN_SYMBOL]: truncateUtf8Bytes({
		text: destinationToken.symbol,
		maxBytes: ACTIVE_USER_TRANSACTION_REF_VALUE_MAX_BYTES
	}),
	[LIFI_EXTERNAL_REF_KEYS.DESTINATION_NETWORK_SYMBOL]: destinationToken.network.name
});
