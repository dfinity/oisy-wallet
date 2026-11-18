import { SUPPORTED_XRP_TOKENS } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import { resetXrpHistoryPager } from '$xrp/services/xrp-history-pager.services';
import {
	xrpTransactionsStore,
	type XrpCertifiedTransaction,
	type XrpTrustLineCertifiedTransaction
} from '$xrp/stores/xrp-transactions.store';
import { xrpTrustLinesStore } from '$xrp/stores/xrp-trust-lines.store';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import { toXrpTrustLineToken } from '$xrp/utils/xrp-trust-line-tokens.utils';
import { parseXrpTokenValue } from '$xrp/utils/xrp-trust-line.utils';
import { isNullish, jsonReviver, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: XrpPostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions,
			trustLines,
			newTrustLineTransactions
		}
	} = data;

	if (nonNullish(balance)) {
		balancesStore.batchSet({
			id: tokenId,
			data: {
				data: balance,
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}

	if (nonNullish(trustLines)) {
		syncTrustLines({ tokenId, lines: trustLines });
	}

	// After the lines, so a token the same message added has its rows filed.
	if (nonNullish(newTrustLineTransactions)) {
		syncTrustLineTransactions({
			tokenId,
			transactions: JSON.parse(newTrustLineTransactions, jsonReviver)
		});
	}

	// Absent means the history could not be read — `loadAndSyncBalance` awaits the request before
	// posting, so this is never "still loading". An empty array must not be written: it would claim
	// the account has no history on the strength of a request that failed.
	//
	// `null` is not that empty page. It records that the read was attempted and produced nothing to
	// show, which settles the aggregate Activity gate. Without it an `account_tx` failure held that
	// gate open for good while the balance kept succeeding — the scheduler folds such a rejection
	// into `undefined` and posts a normal wallet update, so `syncWalletError` never runs and
	// nothing is reported at all.
	//
	// Same guard as the error path: only a never-loaded entry is written, so rows already held are
	// untouched, and the per-token view keeps its skeleton because `xrpTransactionsInitialized`
	// reads `null` as uninitialized.
	if (isNullish(newTransactions)) {
		if (isNullish(get(xrpTransactionsStore)?.[tokenId])) {
			xrpTransactionsStore.nullify(tokenId);
		}

		settleTrustLineHistories({ tokenId });

		return;
	}

	xrpTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});

	settleTrustLineHistories({ tokenId });
};

// The tokens of the lines the account of `tokenId` holds, by id.
const heldTrustLineTokenIds = (tokenId: TokenId): Set<TokenId> => {
	const network = xrpNetworkOf(tokenId);

	if (isNullish(network)) {
		return new Set();
	}

	return new Set(
		(get(xrpTrustLinesStore)[tokenId] ?? []).map(
			(line) => toXrpTrustLineToken({ identity: line, network }).id
		)
	);
};

/**
 * Files each trust-line row the worker read for the account of `tokenId` under its token. Only the
 * tokens the account holds: a row of a line the account no longer has would otherwise wait in the
 * store, and show — or be exported — should a token of that key be added again after the address
 * changed.
 */
const syncTrustLineTransactions = ({
	tokenId,
	transactions
}: {
	tokenId: TokenId;
	transactions: XrpTrustLineCertifiedTransaction[];
}) => {
	const network = xrpNetworkOf(tokenId);

	if (isNullish(network)) {
		return;
	}

	const held = heldTrustLineTokenIds(tokenId);

	const rowsByToken = transactions.reduce((acc, { transaction, ...identity }) => {
		const { id } = toXrpTrustLineToken({ identity, network });

		if (held.has(id)) {
			acc.set(id, [...(acc.get(id) ?? []), transaction]);
		}

		return acc;
	}, new Map<TokenId, XrpCertifiedTransaction[]>());

	rowsByToken.forEach((rows, id) =>
		xrpTransactionsStore.prepend({ tokenId: id, transactions: rows })
	);
};

/**
 * Gives each held token whose history entry is still unwritten the state of the account's own one.
 * The tokens' rows come from the pages the account's history is read from, so once that history is
 * read a token without rows has none there — its page shows that rather than loading for good — and
 * once a read was attempted and failed, the token's entry records the attempt as the account's does.
 */
const settleTrustLineHistories = ({ tokenId }: { tokenId: TokenId }) => {
	const store = get(xrpTransactionsStore);
	const accountHistory = store?.[tokenId];

	if (accountHistory === undefined) {
		return;
	}

	heldTrustLineTokenIds(tokenId).forEach((id) => {
		if (nonNullish(store?.[id])) {
			return;
		}

		if (accountHistory === null) {
			xrpTransactionsStore.nullify(id);

			return;
		}

		xrpTransactionsStore.prepend({ tokenId: id, transactions: [] });
	});
};

const xrpNetworkOf = (tokenId: TokenId) =>
	SUPPORTED_XRP_TOKENS.find(({ id }) => id === tokenId)?.network;

/**
 * Writes the lines the ledger reports for the account of `tokenId` and each held token's balance.
 *
 * A line's balance is written from the account's side: a negative one would mean the account is the
 * party owed — an issuer's position — and holds nothing, so it is shown as zero. A line the ledger no
 * longer reports has been removed: its token leaves the list, and its balance must not linger in the
 * totals.
 */
const syncTrustLines = ({ tokenId, lines }: { tokenId: TokenId; lines: XrpTrustLine[] }) => {
	const network = xrpNetworkOf(tokenId);

	if (isNullish(network)) {
		return;
	}

	const previous = get(xrpTrustLinesStore)[tokenId] ?? [];

	xrpTrustLinesStore.set({ tokenId, lines });

	const held = new Set<TokenId>();

	for (const line of lines) {
		const { id, decimals } = toXrpTrustLineToken({ identity: line, network });
		const value = parseXrpTokenValue({ value: line.balance, decimals });

		held.add(id);

		balancesStore.batchSet({
			id,
			data: { data: value > ZERO ? value : ZERO, certified: false }
		});
	}

	// A removed line takes its token's balance with it, and its history: rows left behind would come
	// back should the token be added again, after the address changed.
	for (const line of previous) {
		const { id } = toXrpTrustLineToken({ identity: line, network });

		if (!held.has(id)) {
			balancesStore.reset(id);
			xrpTransactionsStore.clear(id);
			resetXrpHistoryPager(id);
		}
	}
};

/**
 * Drops what the UI holds for a token, so the next sync starts from nothing.
 *
 * `syncWallet` prepends, so a first page synced for a newly derived address would otherwise be
 * merged into the rows of the address before it — showing, and exporting, another account's
 * history as this one's.
 */
// Ownership handover — a new address, a fresh worker — as distinct from a failure. `clear` leaves
// the entry `undefined`, which the activity view reads as "not loaded yet" and keeps its skeleton
// up for. `reset` writes `null`, which counts as initialized and would announce an empty history
// for an account nothing has asked about. `syncWalletError` keeps `reset`, which is what it means.
export const resetWallet = ({ tokenId }: { tokenId: TokenId }) => {
	balancesStore.reset(tokenId);
	xrpTransactionsStore.clear(tokenId);
	resetXrpHistoryPager(tokenId);

	// The lines belong to the address being handed over, and so do the balances and the history
	// written from them.
	heldTrustLineTokenIds(tokenId).forEach((id) => {
		balancesStore.reset(id);
		xrpTransactionsStore.clear(id);
		resetXrpHistoryPager(id);
	});

	xrpTrustLinesStore.clear(tokenId);
};

export const syncWalletError = ({
	tokenId,
	error: err,
	hideToast = false
}: {
	tokenId: TokenId;
	error: unknown;
	hideToast?: boolean;
}) => {
	const errorText = get(i18n).init.error.xrp_wallet_error;

	// The balance only. Since `5c36dba22` the scheduler rethrows for a rejected `account_info` and
	// absorbs an `account_tx` one, so reaching here means the balance failed — and a stale figure on
	// a funds screen is worth clearing, while history does not go stale the same way: old rows stay
	// true. Clearing it here was unrecoverable, too: the scheduler passes no `marker`, so a sync
	// only ever refetches the newest page and anything older was gone for the session.
	//
	// Ownership changes are `resetWallet`'s job, and it uses `clear` precisely to keep the two apart.
	balancesStore.reset(tokenId);

	// Keeping the rows is not the same as leaving the entry unwritten. `resetWallet` clears it to
	// `undefined` on every worker start, and `isTransactionsStoreInitialized` counts anything that
	// is not `undefined` — so a token whose FIRST load never succeeded holds the aggregate Activity
	// gate open for good: an otherwise-empty account stays on skeletons, and `levelNewcomers` never
	// runs, leaving the chains at uneven floors. A provider outage or a rate limit on first load is
	// enough; no misconfiguration needed.
	//
	// Written only in that never-loaded case, which is what separates this from the unconditional
	// `reset`/`nullify` the other chains do: an entry that already holds rows keeps them, for the
	// reason above.
	if (isNullish(get(xrpTransactionsStore)?.[tokenId])) {
		xrpTransactionsStore.nullify(tokenId);
	}

	settleTrustLineHistories({ tokenId });

	if (hideToast) {
		consoleWarn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
