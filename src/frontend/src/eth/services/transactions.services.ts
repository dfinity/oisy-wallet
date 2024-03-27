import { erc20Tokens } from '$eth/derived/erc20.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { etherscanRests } from '$eth/rest/etherscan.rest';
import { transactionsStore } from '$eth/stores/transactions.store';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { address as addressStore } from '$lib/derived/address.derived';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadTransactions = async ({
	networkId,
	tokenId
}: {
	tokenId: TokenId;
	networkId: NetworkId;
}): Promise<{ success: boolean }> => {
	if (isSupportedEthTokenId(tokenId)) {
		return loadEthTransactions({ networkId, tokenId });
	}

	return loadErc20Transactions({ networkId, tokenId });
};

const loadEthTransactions = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		const {
			init: {
				error: { eth_address_unknown }
			}
		} = get(i18n);

		toastsError({
			msg: { text: eth_address_unknown }
		});

		return { success: false };
	}

	try {
		const { transactions: transactionsProviders } = etherscanProviders(networkId);
		const transactions = await transactionsProviders({ address });
		transactionsStore.set({ tokenId, transactions });
	} catch (err: unknown) {
		transactionsStore.reset();

		const {
			transactions: {
				error: { loading_transactions }
			}
		} = get(i18n);

		toastsError({
			msg: { text: loading_transactions },
			err
		});
		return { success: false };
	}

	return { success: true };
};

export const loadErc20Transactions = async ({
	networkId,
	tokenId
}: {
	networkId: NetworkId;
	tokenId: TokenId;
}): Promise<{ success: boolean }> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		const {
			init: {
				error: { eth_address_unknown }
			}
		} = get(i18n);

		toastsError({
			msg: { text: eth_address_unknown }
		});

		return { success: false };
	}

	const tokens = get(erc20Tokens);
	const token = tokens.find(({ id }) => id === tokenId);

	if (isNullish(token)) {
		const {
			transactions: {
				error: { no_token_loading_transaction }
			}
		} = get(i18n);

		toastsError({
			msg: { text: no_token_loading_transaction }
		});

		return { success: false };
	}

	try {
		const { transactions: transactionsRest } = etherscanRests(networkId);
		const transactions = await transactionsRest({ contract: token, address });
		transactionsStore.set({ tokenId, transactions });
	} catch (err: unknown) {
		transactionsStore.reset();

		const {
			transactions: {
				error: { loading_transactions_symbol }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: replacePlaceholders(loading_transactions_symbol, {
					$symbol: token.symbol
				})
			},
			err
		});
		return { success: false };
	}

	return { success: true };
};
