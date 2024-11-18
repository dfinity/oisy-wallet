import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { etherscanRests } from '$eth/rest/etherscan.rest';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadEthereumTransactions = ({
	networkId,
	tokenId
}: {
	tokenId: TokenId;
	networkId: NetworkId;
}): Promise<ResultSuccess> => {
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
}): Promise<ResultSuccess> => {
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
		ethTransactionsStore.set({ tokenId, transactions });
	} catch (err: unknown) {
		ethTransactionsStore.reset();

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
}): Promise<ResultSuccess> => {
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

	const tokens = get(enabledErc20Tokens);
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
		ethTransactionsStore.set({ tokenId, transactions });
	} catch (err: unknown) {
		ethTransactionsStore.reset();

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
