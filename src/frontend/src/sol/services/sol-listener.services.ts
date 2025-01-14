import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { SolAddress } from '$lib/types/address';
import type { TokenId } from '$lib/types/token';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { initSolWalletConnect } from '$sol/providers/wallet-connect.providers';
import { solTransactionsStore } from '$sol/stores/sol-transactions.store';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { jsonReviver, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

export const syncWallet = ({
	data,
	tokenId
}: {
	data: SolPostMessageDataResponseWallet;
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

	solTransactionsStore.prepend({
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
	const errorText = get(i18n).init.error.sol_wallet_error;

	balancesStore.reset(tokenId);
	solTransactionsStore.reset(tokenId);

	if (hideToast) {
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};

export const initSolWalletConnectListener = (params: {
	uri: string;
	address: SolAddress;
}): Promise<WalletConnectListener> => initSolWalletConnect(params);
