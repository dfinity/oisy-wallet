import { btcTransactionsStore } from '$btc/stores/btc-transactions.store';
import type { BtcPostMessageDataResponseWallet } from '$btc/types/btc-post-message';
import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
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
			balance: { certified, data: balance },
			newTransactions
		}
	} = data;

	if (nonNullish(balance)) {
		balancesStore.set({
			tokenId,
			data: {
				data: BigNumber.from(balance),
				certified
			}
		});
	} else {
		balancesStore.reset(tokenId);
	}

	btcTransactionsStore.prepend({
		tokenId,
		transactions: JSON.parse(newTransactions, jsonReviver)
	});
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
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
