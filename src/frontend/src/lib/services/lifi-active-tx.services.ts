import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import { nativeTokenOf } from '$eth/services/native-balance.services';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import { LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS } from '$lib/constants/swap.constants';
import { fetchLifiStatus } from '$lib/rest/lifi.rest';
import { applyActiveUserTransactionPollUpdate } from '$lib/services/active-user-transactions.services';
import { readEvmSourceTxOutcome } from '$lib/services/evm-source-tx.services';
import { i18n } from '$lib/stores/i18n.store';
import { LIFI_EXTERNAL_REF_KEYS, type LifiExternalRefKey } from '$lib/types/lifi';
import type { Token } from '$lib/types/token';
import {
	advanceStatus,
	isTerminalActiveUserTransactionStatus
} from '$lib/utils/active-user-transactions.utils';
import { consoleError } from '$lib/utils/console.utils';
import {
	isLifiStatusUnresolved,
	isLifiUnresolvedWindow,
	lifiChainIdOfTokenId,
	lifiSourceOutcomeToUpdate,
	lifiStatusPollIntervalMillis,
	nextLifiUnresolvedWindow,
	toLifiExternalRefs,
	toLifiExternalRefsMap,
	toLifiLearnedRefs,
	toLifiStatusUpdate,
	type LifiStatusAnswer,
	type LifiStatusUpdate,
	type LifiUnresolvedWindow
} from '$lib/utils/lifi-active-tx.utils';
import {
	findEvmNetworkByChainId,
	isNetworkIdEthereum,
	isNetworkIdEvm
} from '$lib/utils/network.utils';
import { del, get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { findTokenByBackendTokenId } from '$lib/utils/token-id.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { ChainId, HTTPError, SDKError, type GetStatusRequestExtended } from '@lifi/sdk';
import { get } from 'svelte/store';

// When each row was last polled: LI.FI's per-row cadence runs on top of the loader's 5 s tick.
const lastPolledAt = new Map<string, number>();

// Rows whose source transaction this page has seen confirmed. From then on only `/status` is read;
// after a reload, the receipt is read once more.
const sourceConfirmed = new Set<string>();

// The unresolved window of each row for the session; `localStorage` carries it across reloads.
const unresolvedWindows = new Map<string, LifiUnresolvedWindow>();

const UNRESOLVED_WINDOW_KEY_PREFIX = 'lifi-unresolved:';

const unresolvedWindowKey = (rowId: string): string => `${UNRESOLVED_WINDOW_KEY_PREFIX}${rowId}`;

// Test seam — module-level state would otherwise leak between cases.
export const resetLifiActiveTxState = (): void => {
	lastPolledAt.clear();
	sourceConfirmed.clear();
	unresolvedWindows.clear();
};

/**
 * Drops what this module keeps for rows that are no longer pending, wherever they settled: here, in
 * another tab or on another device. `pendingIds` is every pending LI.FI row, and the state is
 * LI.FI's alone, so nothing another provider relies on is dropped.
 */
const forgetSettledRows = (pendingIds: Set<string>) => {
	for (const rowId of [...lastPolledAt.keys(), ...sourceConfirmed, ...unresolvedWindows.keys()]) {
		if (!pendingIds.has(rowId)) {
			lastPolledAt.delete(rowId);
			sourceConfirmed.delete(rowId);
			unresolvedWindows.delete(rowId);
		}
	}

	try {
		Object.keys(localStorage)
			.filter(
				(key) =>
					key.startsWith(UNRESOLVED_WINDOW_KEY_PREFIX) &&
					!pendingIds.has(key.slice(UNRESOLVED_WINDOW_KEY_PREFIX.length))
			)
			.forEach((key) => localStorage.removeItem(key));
	} catch (err: unknown) {
		// Best effort: a window left behind is never read again, since its row is not pending.
		consoleError(err);
	}
};

// The session's own window first: should a write fail (a full storage), every poll would otherwise
// start over from the same stale stored window, and the bound would never be reached. The stored
// window only resumes it after a reload.
const readUnresolvedWindow = (rowId: string): LifiUnresolvedWindow | undefined => {
	const inMemory = unresolvedWindows.get(rowId);

	if (nonNullish(inMemory)) {
		return inMemory;
	}

	const stored = getStorage<unknown>({ key: unresolvedWindowKey(rowId) });

	return isLifiUnresolvedWindow(stored) ? stored : undefined;
};

const writeUnresolvedWindow = ({
	rowId,
	window
}: {
	rowId: string;
	window: LifiUnresolvedWindow;
}) => {
	unresolvedWindows.set(rowId, window);
	setStorage({ key: unresolvedWindowKey(rowId), value: window });
};

const clearUnresolvedWindow = (rowId: string) => {
	unresolvedWindows.delete(rowId);
	del({ key: unresolvedWindowKey(rowId) });
};

const forgetRow = (rowId: string) => {
	lastPolledAt.delete(rowId);
	sourceConfirmed.delete(rowId);
	clearUnresolvedWindow(rowId);
};

/**
 * Adds this poll to the row's unresolved window. Nothing changes until the window reaches
 * `LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS`; then the row fails as "outcome unknown", not as lost
 * funds. Only reached once the source is confirmed: before that, an unresolved `/status` is
 * expected, and the source chain decides.
 */
const observeUnresolvedStatus = (rowId: string): LifiStatusUpdate | undefined => {
	const window = nextLifiUnresolvedWindow({
		window: readUnresolvedWindow(rowId),
		now: Date.now()
	});

	writeUnresolvedWindow({ rowId, window });

	return window.elapsedMs >= LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS
		? { status: { Failed: null }, error: get(i18n).swap.error.lifi_status_unknown }
		: undefined;
};

// LI.FI may answer a transfer it does not know with an HTTP 404 (code 1003) instead of a
// `NOT_FOUND` status. It is an answer, not a failure: left to the per-row catch, it would skip the
// unresolved bound, and a row whose source is confirmed could stay pending forever.
const isLifiNotFoundError = (err: unknown): boolean =>
	err instanceof SDKError &&
	err.cause instanceof HTTPError &&
	(err.cause.status === 404 || err.cause.responseBody?.code === 1003);

const fetchLifiStatusAnswer = async (
	request: GetStatusRequestExtended
): Promise<LifiStatusAnswer> => {
	try {
		return await fetchLifiStatus(request);
	} catch (err: unknown) {
		if (isLifiNotFoundError(err)) {
			return { status: 'NOT_FOUND' };
		}

		throw err;
	}
};

const readLifiStatus = async ({
	txHash,
	fromChain,
	toChain,
	bridge
}: {
	txHash: string;
	fromChain: number;
	toChain: number;
	bridge: string | undefined;
}): Promise<LifiStatusAnswer> => {
	const request = { txHash, fromChain, toChain };

	if (isNullish(bridge)) {
		return await fetchLifiStatusAnswer(request);
	}

	const answer = await fetchLifiStatusAnswer({ ...request, bridge });

	// `INVALID` means LI.FI cannot tie the hash to the bridge or chains asked about, which does not
	// fix itself; the stored tool may be what it rejects.
	return answer.status === 'INVALID' ? await fetchLifiStatusAnswer(request) : answer;
};

const applyUpdate = async ({
	identity,
	tx,
	refs,
	update,
	learned
}: {
	identity: Identity;
	tx: ActiveUserTransaction;
	refs: Partial<Record<LifiExternalRefKey, string>>;
	update: LifiStatusUpdate | undefined;
	learned: Partial<Record<LifiExternalRefKey, string>>;
}): Promise<void> => {
	const next: ActiveUserTransactionStatus | undefined = nonNullish(update)
		? advanceStatus({ current: tx.status, candidate: update.status })
		: undefined;

	// Persist newly-learned refs even when the status itself does not advance.
	const hasNewRefs = (Object.keys(learned) as LifiExternalRefKey[]).some(
		(key) => refs[key] !== learned[key]
	);

	await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			...(nonNullish(next) ? { status: next } : {}),
			...(nonNullish(next) && 'Failed' in next && nonNullish(update?.error)
				? { error: update.error }
				: {}),
			...(hasNewRefs ? { externalRefs: toLifiExternalRefs({ ...refs, ...learned }) } : {})
		}
	});

	// A row this poll settles leaves the pending set, and if it was the last LI.FI row, no later poll
	// would prune it. Should the write have failed, the row stays pending and is polled afresh, which
	// can only delay its verdict.
	if (nonNullish(next) && isTerminalActiveUserTransactionStatus(next)) {
		forgetRow(tx.id);
	}
};

const isDue = ({ tx, now }: { tx: ActiveUserTransaction; now: number }): boolean => {
	const last = lastPolledAt.get(tx.id);

	// A clock set back puts the last poll in the future: poll now, and count from here.
	if (isNullish(last) || now < last) {
		return true;
	}

	const ageMillis = now - Number(tx.created_at_ns / 1_000_000n);

	return now - last >= lifiStatusPollIntervalMillis(ageMillis);
};

/**
 * Whether the row's EVM source transaction is confirmed. Until it is, the source chain's verdict is
 * written: in flight, reverted, or replaced or dropped (seen on two consecutive polls).
 */
const checkEvmSource = async ({
	tx,
	identity,
	refs,
	fromChain,
	txHash,
	userAddress,
	confirmedNonceByChainId
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	refs: Partial<Record<LifiExternalRefKey, string>>;
	fromChain: number;
	txHash: string;
	userAddress: EthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
}): Promise<boolean> => {
	const nonce = refs[LIFI_EXTERNAL_REF_KEYS.TX_NONCE];
	const network = findEvmNetworkByChainId(BigInt(fromChain));
	const txNonce = Number(nonce);

	if (isNullish(nonce) || isNullish(network) || Number.isNaN(txNonce)) {
		consoleError(`LI.FI row ${tx.id} has no usable source chain or nonce`);
		return false;
	}

	const outcome = await readEvmSourceTxOutcome({
		rowId: tx.id,
		hash: txHash,
		txNonce,
		network,
		userAddress,
		confirmedNonceByChainId
	});

	if (outcome === 'succeeded') {
		sourceConfirmed.add(tx.id);
		return true;
	}

	if (outcome === 'unknown') {
		consoleError(`Unexpected receipt for LI.FI source transaction ${txHash}`);
	}

	await applyUpdate({
		identity,
		tx,
		refs,
		update: lifiSourceOutcomeToUpdate(outcome),
		learned: {}
	});

	return false;
};

const pollLifiActiveUserTransaction = async ({
	tx,
	identity,
	userAddress,
	confirmedNonceByChainId
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	userAddress: EthAddress;
	confirmedNonceByChainId: Map<string, Promise<number>>;
}): Promise<void> => {
	if (!('Lifi' in tx.data)) {
		return;
	}

	const fromChain = lifiChainIdOfTokenId(tx.data.Lifi.source_token);
	const toChain = lifiChainIdOfTokenId(tx.data.Lifi.dest_token);

	// Unreachable for a row OISY creates: the backend refuses a pair outside the v1 matrix.
	if (isNullish(fromChain) || isNullish(toChain)) {
		consoleError(`LI.FI row ${tx.id} has a token outside the v1 matrix`);
		return;
	}

	// The Solana source check comes with Solana-source swaps; until then OISY opens no such row.
	if (fromChain === ChainId.SOL) {
		return;
	}

	const refs = toLifiExternalRefsMap(tx.external_refs);
	const txHash = refs[LIFI_EXTERNAL_REF_KEYS.TX_HASH];

	if (isNullish(txHash)) {
		return;
	}

	const now = Date.now();

	if (!isDue({ tx, now })) {
		return;
	}

	lastPolledAt.set(tx.id, now);

	if (
		!sourceConfirmed.has(tx.id) &&
		!(await checkEvmSource({
			tx,
			identity,
			refs,
			fromChain,
			txHash,
			userAddress,
			confirmedNonceByChainId
		}))
	) {
		return;
	}

	const answer = await readLifiStatus({
		txHash,
		fromChain,
		toChain,
		bridge: refs[LIFI_EXTERNAL_REF_KEYS.TOOL]
	});

	const learned = toLifiLearnedRefs({ answer, toChain });

	if (isLifiStatusUnresolved(answer)) {
		await applyUpdate({ identity, tx, refs, update: observeUnresolvedStatus(tx.id), learned });
		return;
	}

	clearUnresolvedWindow(tx.id);

	const update = toLifiStatusUpdate(answer);

	if (isNullish(update)) {
		consoleError(`Unmapped LI.FI status: ${answer.status}`);
	}

	await applyUpdate({ identity, tx, refs, update, learned });
};

/**
 * Advances the pending LI.FI rows: the source chain decides until the source transaction is
 * confirmed, then LI.FI's `/status`, each row at LI.FI's recommended cadence. Errors are caught per
 * row and leave it untouched until its next poll.
 *
 * `userAddress` is the caller's EVM address, which signed every EVM-source row: rows are
 * principal-scoped and OISY derives one EVM address per principal. They are skipped while it is
 * unavailable. `confirmedNonceByChainId` is shared with the other EVM pollers of the same tick, so
 * rows on one chain cost one nonce read whatever their provider.
 */
export const pollLifiActiveUserTransactions = async ({
	identity,
	transactions,
	userAddress,
	confirmedNonceByChainId = new Map<string, Promise<number>>()
}: {
	identity: Identity;
	transactions: ActiveUserTransaction[];
	userAddress: OptionEthAddress;
	confirmedNonceByChainId?: Map<string, Promise<number>>;
}): Promise<void> => {
	forgetSettledRows(new Set(transactions.map(({ id }) => id)));

	if (transactions.length === 0 || isNullish(userAddress)) {
		return;
	}

	await Promise.all(
		transactions.map(async (tx) => {
			try {
				await pollLifiActiveUserTransaction({ tx, identity, userAddress, confirmedNonceByChainId });
			} catch (err: unknown) {
				// A transient RPC or API blip must leave the row pending so the next poll retries; one
				// failing row never poisons the batch.
				consoleError(err);
			}
		})
	);
};

const isEvmToken = ({ network: { id } }: Token): boolean =>
	isNetworkIdEthereum(id) || isNetworkIdEvm(id);

/**
 * Reloads the EVM balances a terminal LI.FI row may have moved: the source token and its network's
 * native token (gas, and where a refund may land) whatever the outcome, and the destination token
 * when it is on an EVM network. No wallet worker refreshes EVM balances, and the swap modal closed
 * at broadcast, so nothing else does when the route settles. A token no longer enabled is skipped.
 *
 * Best effort and not awaited: a balance that fails to reload is what the periodic poll resolves.
 */
export const reloadLifiEvmBalances = ({
	tx,
	tokens
}: {
	tx: ActiveUserTransaction;
	tokens: Token[];
}): void => {
	if (!('Lifi' in tx.data)) {
		return;
	}

	const sourceToken = findTokenByBackendTokenId({ tokenId: tx.data.Lifi.source_token, tokens });
	const destinationToken = findTokenByBackendTokenId({ tokenId: tx.data.Lifi.dest_token, tokens });

	const evmTokens = new Map<Token['id'], Token>();

	for (const token of [
		sourceToken,
		nonNullish(sourceToken) ? nativeTokenOf(sourceToken.network.id) : undefined,
		destinationToken
	]) {
		if (nonNullish(token) && isEvmToken(token)) {
			evmTokens.set(token.id, token);
		}
	}

	for (const token of evmTokens.values()) {
		reloadEthereumBalance(token).catch(consoleError);
	}
};
