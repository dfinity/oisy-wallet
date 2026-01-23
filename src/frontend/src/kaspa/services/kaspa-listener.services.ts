import { balancesStore } from '$lib/stores/balances.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import { kaspaTransactionsStore } from '$kaspa/stores/kaspa-transactions.store';
import type { KaspaPostMessageDataResponseWallet } from '$kaspa/types/kaspa-post-message';
import { jsonReviver, nonNullish } from '@dfinity/utils';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: KaspaPostMessageDataResponseWallet;
	tokenId: TokenId;
}) => {
	const {
		wallet: {
			balance: { certified, data: balance },
			newTransactions
		}
	} = data;

	if (nonNullish(balance)) {
		balancesStore.set({
			id: tokenId,
			data: {
				data: balance,
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}

	if (nonNullish(newTransactions)) {
		kaspaTransactionsStore.prepend({
			tokenId,
			transactions: JSON.parse(newTransactions, jsonReviver)
		});
	}
};

export type { KaspaPostMessageDataResponseWallet };

export const syncWalletError = ({
	tokenId,
	error: err,
	hideToast = false
}: {
	tokenId: TokenId;
	error: unknown;
	hideToast?: boolean;
}) => {
	// Use a fallback error message since Kaspa i18n may not be configured yet
	const errorText = 'Error loading Kaspa wallet';

	balancesStore.reset(tokenId);
	kaspaTransactionsStore.reset(tokenId);

	if (hideToast) {
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
