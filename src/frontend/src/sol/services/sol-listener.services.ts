import { balancesStore } from '$lib/stores/balances.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { TokenId } from '$lib/types/token';
import type { SolPostMessageDataResponseWallet } from '$sol/types/sol-post-message';
import { nonNullish } from '@dfinity/utils';
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
			balance: { certified, data: balance }
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

	// Transaction handling will be added later
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
	// Transaction store reset will be added when implementing transactions

	if (hideToast) {
		console.warn(`${errorText}:`, err);
		return;
	}

	toastsError({
		msg: { text: errorText },
		err
	});
};
