import type {
	ActiveUserTransaction,
	ActiveUserTransactionStatus
} from '$declarations/backend/backend.did';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import type { EthAddress, OptionEthAddress } from '$eth/types/address';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
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
	isLifiStoredUnresolvedWindow,
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
	type LifiStoredUnresolvedWindow,
	type LifiUnresolvedWindow
} from '$lib/utils/lifi-active-tx.utils';
import { findEvmNetworkByChainId } from '$lib/utils/network.utils';
import { del, get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { findTokenByBackendTokenId } from '$lib/utils/token-id.utils';
import { readSolSourceTxOutcome } from '$sol/services/sol-source-tx.services';
import { SolanaNetworks } from '$sol/types/network';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Identity } from '@icp-sdk/core/agent';
import { ChainId, HTTPError, SDKError, type GetStatusRequestExtended } from '@lifi/sdk';
import { get } from 'svelte/store';

// When each row was last polled: LI.FI's per-row cadence runs on top of the loader's 5 s tick.
const lastPolledAt = new Map<string, number>();

// Rows whose source transaction this page has seen confirmed. From then on the source chain is not
// read again (after a reload, once more), and only a cross-chain row asks `/status`.
const sourceConfirmed = new Set<string>();

// Rows whose stored tool LI.FI refused (`INVALID`): from then on, `/status` is asked without it.
const toolRefused = new Set<string>();

// The unresolved window of each row for the session; `localStorage` carries it across reloads.
const unresolvedWindows = new Map<string, LifiUnresolvedWindow>();

const unresolvedWindowKey = (rowId: string): string => `lifi-unresolved:${rowId}`;

// Test seam — module-level state would otherwise leak between cases.
export const resetLifiActiveTxState = (): void => {
	lastPolledAt.clear();
	sourceConfirmed.clear();
	toolRefused.clear();
	unresolvedWindows.clear();
};

// The session's own window first: should a write fail (a full storage), every poll would otherwise
// start over from the same stale stored window, and the bound would never be reached. The stored
// window only resumes it after a reload.
const readUnresolvedWindow = (
	rowId: string
): LifiUnresolvedWindow | LifiStoredUnresolvedWindow | undefined => {
	const inMemory = unresolvedWindows.get(rowId);

	if (nonNullish(inMemory)) {
		return inMemory;
	}

	const stored = getStorage<unknown>({ key: unresolvedWindowKey(rowId) });

	return isLifiStoredUnresolvedWindow(stored) ? { elapsedMs: stored.elapsedMs } : undefined;
};

const writeUnresolvedWindow = ({
	rowId,
	window
}: {
	rowId: string;
	window: LifiUnresolvedWindow;
}) => {
	unresolvedWindows.set(rowId, window);
	setStorage<LifiStoredUnresolvedWindow>({
		key: unresolvedWindowKey(rowId),
		value: { elapsedMs: window.elapsedMs }
	});
};

const clearUnresolvedWindow = (rowId: string) => {
	unresolvedWindows.delete(rowId);
	del({ key: unresolvedWindowKey(rowId) });
};

const forgetRow = (rowId: string) => {
	lastPolledAt.delete(rowId);
	sourceConfirmed.delete(rowId);
	toolRefused.delete(rowId);
	clearUnresolvedWindow(rowId);
};

/**
 * Drops what this module keeps for rows that are no longer pending, wherever they settled: here, in
 * another tab or on another device. `pendingIds` is every pending LI.FI row, and the state is
 * LI.FI's alone, so nothing another provider relies on is dropped.
 *
 * Only the stored windows of rows this tab keeps are removed. Every window it reads it also
 * writes, so these are all it has touched; another tab's rows, or another principal's on the same
 * browser, are missing from this tab's pending set but not settled. A window whose row settled
 * while no tab of this browser polled it stays behind, and is never read again.
 */
const forgetSettledRows = (pendingIds: Set<string>) => {
	for (const rowId of [
		...lastPolledAt.keys(),
		...sourceConfirmed,
		...toolRefused,
		...unresolvedWindows.keys()
	]) {
		if (!pendingIds.has(rowId)) {
			forgetRow(rowId);
		}
	}
};

/**
 * Adds this poll to the row's unresolved window. Nothing changes until the window reaches
 * `LIFI_STATUS_UNRESOLVED_PERIOD_MILLIS`; then the row fails as "outcome unknown", not as lost
 * funds. Only reached once the source is confirmed: before that, an unresolved `/status` is
 * expected, and the source chain decides.
 *
 * Measured on the monotonic clock, not `Date.now()`: the verdict is irreversible, and a forward
 * correction of the system clock must not bring it any closer.
 */
const observeUnresolvedStatus = (rowId: string): LifiStatusUpdate | undefined => {
	const window = nextLifiUnresolvedWindow({
		window: readUnresolvedWindow(rowId),
		now: performance.now()
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
	rowId,
	txHash,
	fromChain,
	toChain,
	bridge
}: {
	rowId: string;
	txHash: string;
	fromChain: number;
	toChain: number;
	bridge: string | undefined;
}): Promise<LifiStatusAnswer> => {
	const request = { txHash, fromChain, toChain };

	if (isNullish(bridge) || toolRefused.has(rowId)) {
		return await fetchLifiStatusAnswer(request);
	}

	const answer = await fetchLifiStatusAnswer({ ...request, bridge });

	if (answer.status !== 'INVALID') {
		return answer;
	}

	// `INVALID` means LI.FI cannot tie the hash to the bridge or chains asked about, which does not
	// fix itself; the stored tool may be what it rejects. Remembered, so that a row left unresolved
	// costs one request per poll, not two.
	toolRefused.add(rowId);

	return await fetchLifiStatusAnswer(request);
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

	// New refs go out with a status, the one this poll read when it does not advance. The backend
	// only checks a transition when a status is supplied, and replaces the refs wholesale: without
	// it, a write based on a stale read could strip the refs another tab wrote as it settled the row.
	// With it, that write is refused as an illegal transition.
	const status = next ?? (hasNewRefs ? tx.status : undefined);

	const written = await applyActiveUserTransactionPollUpdate({
		identity,
		tx,
		update: {
			...(nonNullish(status) ? { status } : {}),
			...(nonNullish(next) && 'Failed' in next && nonNullish(update?.error)
				? { error: update.error }
				: {}),
			...(hasNewRefs ? { externalRefs: toLifiExternalRefs({ ...refs, ...learned }) } : {})
		}
	});

	// A row this poll settles leaves the pending set, and if it was the last LI.FI row, no later poll
	// would prune it. Only once the write landed: should it fail, the row stays pending with its
	// state, so that the next poll repeats the verdict rather than reopening a 6 h window.
	if (written && nonNullish(next) && isTerminalActiveUserTransactionStatus(next)) {
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

/**
 * Whether the row's Solana source transaction is confirmed. Until it is, the network's verdict is
 * written: in flight, reverted, or expired without landing (seen on two consecutive polls).
 */
const checkSolSource = async ({
	tx,
	identity,
	refs,
	txHash
}: {
	tx: ActiveUserTransaction;
	identity: Identity;
	refs: Partial<Record<LifiExternalRefKey, string>>;
	txHash: string;
}): Promise<boolean> => {
	const blockhash = refs[LIFI_EXTERNAL_REF_KEYS.BLOCKHASH];

	if (isNullish(blockhash)) {
		consoleError(`LI.FI row ${tx.id} has no blockhash`);
		return false;
	}

	// LI.FI's Solana rows are mainnet only: the backend refuses a devnet token.
	const outcome = await readSolSourceTxOutcome({
		rowId: tx.id,
		signature: txHash,
		blockhash,
		network: SolanaNetworks.mainnet
	});

	if (outcome === 'succeeded') {
		sourceConfirmed.add(tx.id);
		return true;
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
	userAddress: OptionEthAddress;
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

	const refs = toLifiExternalRefsMap(tx.external_refs);
	const txHash = refs[LIFI_EXTERNAL_REF_KEYS.TX_HASH];

	if (isNullish(txHash)) {
		return;
	}

	// A Solana source is read by its signature and blockhash alone. An EVM source is read with the
	// address that signed it, so its row waits while that address is unavailable.
	let checkSource: () => Promise<boolean>;

	if (fromChain === ChainId.SOL) {
		checkSource = () => checkSolSource({ tx, identity, refs, txHash });
	} else if (nonNullish(userAddress)) {
		checkSource = () =>
			checkEvmSource({
				tx,
				identity,
				refs,
				fromChain,
				txHash,
				userAddress,
				confirmedNonceByChainId
			});
	} else {
		return;
	}

	const now = Date.now();

	if (!isDue({ tx, now })) {
		return;
	}

	lastPolledAt.set(tx.id, now);

	if (!sourceConfirmed.has(tx.id) && !(await checkSource())) {
		return;
	}

	// A same-chain route swaps inside the source transaction itself, which reverts unless the user
	// receives at least the minimum: its confirmed receipt is the outcome, as for Velora Market.
	if (fromChain === toChain) {
		await applyUpdate({ identity, tx, refs, update: { status: { Succeeded: null } }, learned: {} });
		return;
	}

	const answer = await readLifiStatus({
		rowId: tx.id,
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
 * confirmed, which settles a same-chain swap, then LI.FI's `/status` a cross-chain one, each row at
 * LI.FI's recommended cadence. Errors are caught per row and leave it untouched until its next poll.
 *
 * `userAddress` is the caller's EVM address, which signed every EVM-source row: rows are
 * principal-scoped and OISY derives one EVM address per principal. EVM-source rows are skipped while
 * it is unavailable; a Solana-source row needs no address. `confirmedNonceByChainId` is shared with
 * the other EVM pollers of the same tick, so rows on one chain cost one nonce read whatever their
 * provider.
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

	if (transactions.length === 0) {
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

// What `reloadEthereumBalance` can load: native EVM coins, ERC-20s and ERC-4626 vaults. It hands
// anything else to the ERC-20 loader, where an NFT collection fails and resets its balance.
const isReloadableEvmToken = (token: Token): boolean =>
	isSupportedEthTokenId(token.id) ||
	isSupportedEvmNativeTokenId(token.id) ||
	isTokenErc20(token) ||
	isTokenErc4626(token);

/**
 * Reloads the EVM balances a terminal LI.FI row may have moved: the source token and its network's
 * native token (gas, and where a refund may land) whatever the outcome, and the destination token
 * when it is on an EVM network, or after a partial payout every enabled token of the destination
 * chain. No wallet worker refreshes EVM balances, and the swap modal closed at broadcast, so
 * nothing else does when the route settles. A token no longer enabled is skipped, and so is any
 * `tokens` entry that is not a fungible EVM token.
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
	const sourceChainId = lifiChainIdOfTokenId(tx.data.Lifi.source_token);
	const destinationChainId = lifiChainIdOfTokenId(tx.data.Lifi.dest_token);

	// Found from the row's source chain rather than from the source token, so that it is reloaded
	// even when that token was disabled since. A non-EVM chain has no such token, and none is found.
	const gasToken = nonNullish(sourceChainId)
		? findTokenByBackendTokenId({ tokenId: { EvmNative: BigInt(sourceChainId) }, tokens })
		: undefined;

	// A partial payout came in a token other than the one asked for, which the row does not
	// identify, so every enabled token of the destination chain is reloaded.
	const isPartialPayout =
		toLifiExternalRefsMap(tx.external_refs)[LIFI_EXTERNAL_REF_KEYS.SUBSTATUS] === 'PARTIAL';

	// Only EVM networks carry a `chainId`; what of them is not fungible is left out below.
	const payoutTokens =
		isPartialPayout && nonNullish(destinationChainId)
			? tokens.filter(
					({ network }) =>
						(network as Partial<EthereumNetwork>).chainId === BigInt(destinationChainId)
				)
			: [];

	const evmTokens = new Map<Token['id'], Token>();

	for (const token of [sourceToken, gasToken, destinationToken, ...payoutTokens]) {
		if (nonNullish(token) && isReloadableEvmToken(token)) {
			evmTokens.set(token.id, token);
		}
	}

	for (const token of evmTokens.values()) {
		reloadEthereumBalance(token).catch(consoleError);
	}
};
