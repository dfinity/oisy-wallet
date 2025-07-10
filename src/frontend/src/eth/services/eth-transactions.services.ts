import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.contants';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import { trackEvent } from '$lib/services/analytics.services';
import { retryWithDelay } from '$lib/services/rest.services';
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
	tokenId,
	updateOnly = false,
	silent = false
}: {
	tokenId: TokenId;
	networkId: NetworkId;
	updateOnly?: boolean;
	silent?: boolean;
}): Promise<ResultSuccess> => {
	if (isSupportedEthTokenId(tokenId) || isSupportedEvmNativeTokenId(tokenId)) {
		return loadEthTransactions({ networkId, tokenId, updateOnly, silent });
	}

	return loadErc20Transactions({ networkId, tokenId, updateOnly });
};

// If we use the update method instead of the set method, we can keep the existing transactions and just update their data.
// Plus, we add new transactions to the existing ones.
export const reloadEthereumTransactions = (params: {
	tokenId: TokenId;
	networkId: NetworkId;
	silent?: boolean;
}): Promise<ResultSuccess> => loadEthereumTransactions({ ...params, updateOnly: true });

const loadEthTransactions = async ({
	networkId,
	tokenId,
	updateOnly = false,
	silent = false
}: {
	networkId: NetworkId;
	tokenId: TokenId;
	updateOnly?: boolean;
	silent?: boolean;
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

		if (updateOnly) {
			transactions.forEach((transaction) => ethTransactionsStore.update({ tokenId, transaction }));
		} else {
			ethTransactionsStore.set({ tokenId, transactions });
		}
	} catch (err: unknown) {
		ethTransactionsStore.nullify(tokenId);

		if (!silent) {
			const {
				transactions: {
					error: { loading_transactions_symbol }
				}
			} = get(i18n);

			trackEvent({
				name: TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR,
				metadata: {
					tokenId: `${tokenId.description}`,
					networkId: `${networkId.description}`,
					error: `${err}`
				},
				warning: `${replacePlaceholders(loading_transactions_symbol, {
					$symbol: ETHEREUM_NETWORK_SYMBOL
				})} ${err}`
			});
		}

		return { success: false };
	}

	return { success: true };
};

const loadErc20Transactions = async ({
	networkId,
	tokenId,
	updateOnly = false
}: {
	networkId: NetworkId;
	tokenId: TokenId;
	updateOnly?: boolean;
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
		const { erc20Transactions } = etherscanProviders(networkId);
		const transactions = await retryWithDelay({
			request: async () => await erc20Transactions({ contract: token, address })
		});

		if (updateOnly) {
			transactions.forEach((transaction) => ethTransactionsStore.update({ tokenId, transaction }));
		} else {
			ethTransactionsStore.set({ tokenId, transactions });
		}
	} catch (err: unknown) {
		ethTransactionsStore.nullify(tokenId);

		const {
			transactions: {
				error: { loading_transactions_symbol }
			}
		} = get(i18n);

		trackEvent({
			name: TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR,
			metadata: {
				tokenId: `${tokenId.description}`,
				networkId: `${networkId.description}`,
				error: `${err}`
			},
			warning: `${replacePlaceholders(loading_transactions_symbol, {
				$symbol: token.symbol
			})} ${err}`
		});

		return { success: false };
	}

	return { success: true };
};
