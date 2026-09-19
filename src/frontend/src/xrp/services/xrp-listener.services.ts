import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import { xrpTransactionsStore } from '$xrp/stores/xrp-transactions.store';
import type { XrpPostMessageDataResponseWallet } from '$xrp/types/xrp-post-message';
import { jsonReviver, nonNullish } from '@dfinity/utils';
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
export const resetWallet = ({ tokenId }: { tokenId: TokenId }) => {
	balancesStore.reset(tokenId);
	xrpTransactionsStore.reset(tokenId);
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

	balancesStore.reset(tokenId);
	xrpTransactionsStore.reset(tokenId);

	if (hideToast) {
		consoleWarn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
