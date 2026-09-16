import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcTransactionUi } from '$btc/types/btc';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { getIdbBtcTransactions } from '$lib/api/idb-transactions.api';
import { syncWalletFromIdbCache } from '$lib/services/listener.services';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { GetIdbTransactionsParams } from '$lib/types/idb-transactions';
import type { CertifiedData } from '$lib/types/store';
import type { TokenId } from '$lib/types/token';
import { consoleWarn } from '$lib/utils/console.utils';
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: BtcPostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: btcWalletBalance },
			newTransactions
		}
	} = data;

	// The worker posts the new transactions on query and certified syncs alike: after the
	// query-only warm-up, the certified sync is the only one still running.
	const providerTransactions: CertifiedData<BtcTransactionUi>[] = JSON.parse(
		newTransactions,
		jsonReviver
	);

	if (providerTransactions.length > 0) {
		btcTransactionsStore.prepend({
			tokenId,
			transactions: providerTransactions
		});
	}
	if (nonNullish(btcWalletBalance)) {
		balancesStore.batchSet({
			id: tokenId,
			data: {
				data: btcWalletBalance.confirmed,
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}
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
	const errorText = get(i18n).init.error.btc_wallet_error;

	balancesStore.reset(tokenId);

	// Currently, the certified error can only happen while fetching balance, but we still want to reset transactions to avoid displaying incorrect data
	btcTransactionsStore.reset(tokenId);

	if (hideToast) {
		consoleWarn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};

export const syncWalletFromCache = (params: Omit<GetIdbTransactionsParams, 'principal'>) =>
	syncWalletFromIdbCache({
		...params,
		getIdbTransactions: getIdbBtcTransactions,
		transactionsStore: btcTransactionsStore
	});
