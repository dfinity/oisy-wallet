import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
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
			newTransactions
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

	// Absent means the history could not be read. Writing anything here — including an empty
	// array — marks the store initialized, and the UI would report the account as having no
	// activity on the strength of a request that failed.
	if (isNullish(newTransactions)) {
		return;
	}

	xrpTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
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

	if (hideToast) {
		consoleWarn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
