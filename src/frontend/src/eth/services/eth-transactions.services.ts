import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { enabledErc1155Tokens } from '$eth/derived/erc1155.derived';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledErc4626Tokens } from '$eth/derived/erc4626.derived';
import { enabledErc721Tokens } from '$eth/derived/erc721.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc20CustomToken } from '$eth/types/erc20-custom-token';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.constants';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import { trackEvent } from '$lib/services/analytics.services';
import { retryWithDelay } from '$lib/services/rest.services';
import { i18n } from '$lib/stores/i18n.store';
import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { TokenId, TokenStandard } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadEthereumTransactions = ({
	networkId,
	tokenId,
	standard,
	updateOnly = false,
	silent = false
}: {
	tokenId: TokenId;
	networkId: NetworkId;
	standard: TokenStandard;
	updateOnly?: boolean;
	silent?: boolean;
}): Promise<ResultSuccess> => {
	if (isSupportedEthTokenId(tokenId) || isSupportedEvmNativeTokenId(tokenId)) {
		return loadEthTransactions({ networkId, tokenId, updateOnly, silent });
	}

	return loadErcTransactions({ networkId, tokenId, standard, updateOnly });
};

// If we use the update method instead of the set method, we can keep the existing transactions and just update their data.
// Plus, we add new transactions to the existing ones.
export const reloadEthereumTransactions = (params: {
	tokenId: TokenId;
	networkId: NetworkId;
	standard: TokenStandard;
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
		return { success: false };
	}

	try {
		const { transactions: transactionsProviders } = etherscanProviders(networkId);
		const transactions = await transactionsProviders({ address });

		const certifiedTransactions = transactions.map((transaction) => ({
			data: transaction,
			// We set the certified property to false because we don't have a way to certify ETH transactions for now.
			certified: false
		}));

		if (updateOnly) {
			certifiedTransactions.forEach((transaction) =>
				ethTransactionsStore.update({ tokenId, transaction })
			);
		} else {
			ethTransactionsStore.set({ tokenId, transactions: certifiedTransactions });
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

const loadErcTransactions = async ({
	networkId,
	tokenId,
	standard,
	updateOnly = false
}: {
	networkId: NetworkId;
	tokenId: TokenId;
	standard: TokenStandard;
	updateOnly?: boolean;
}): Promise<ResultSuccess> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		return { success: false };
	}

	const tokens = [
		...get(enabledErc20Tokens),
		...get(enabledErc721Tokens),
		...get(enabledErc4626Tokens),
		...get(enabledErc1155Tokens)
	];
	const token = tokens.find(
		({ id, network, standard: tokenStandard }) =>
			id === tokenId && network.id === networkId && tokenStandard === standard
	);

	if (isNullish(token)) {
		return { success: false };
	}

	try {
		const transactions =
			isTokenErc20(token) || isTokenErc4626(token)
				? await loadErc20Transactions({ networkId, token, address })
				: isTokenErc721(token)
					? await loadErc721Transactions({ networkId, token, address })
					: isTokenErc1155(token)
						? await loadErc1155Transactions({ networkId, token, address })
						: [];

		const certifiedTransactions = transactions.map((transaction) => ({
			data: transaction,
			// We set the certified property to false because we don't have a way to certify ERC transactions for now.
			certified: false
		}));

		if (updateOnly) {
			certifiedTransactions.forEach((transaction) =>
				ethTransactionsStore.update({ tokenId, transaction })
			);
		} else {
			ethTransactionsStore.set({ tokenId, transactions: certifiedTransactions });
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

const loadErc20Transactions = async ({
	networkId,
	token,
	address
}: {
	networkId: NetworkId;
	token: Erc20CustomToken | Erc4626CustomToken;
	address: Address;
}): Promise<Transaction[]> => {
	const { erc20Transactions } = etherscanProviders(networkId);
	return await retryWithDelay({
		request: async () => await erc20Transactions({ contract: token, address })
	});
};

const loadErc721Transactions = async ({
	networkId,
	token,
	address
}: {
	networkId: NetworkId;
	token: Erc721CustomToken;
	address: Address;
}): Promise<Transaction[]> => {
	const { erc721Transactions } = etherscanProviders(networkId);
	return await retryWithDelay({
		request: async () => await erc721Transactions({ contract: token, address })
	});
};

const loadErc1155Transactions = async ({
	networkId,
	token,
	address
}: {
	networkId: NetworkId;
	token: Erc1155CustomToken;
	address: Address;
}): Promise<Transaction[]> => {
	const { erc1155Transactions } = etherscanProviders(networkId);
	return await retryWithDelay({
		request: async () => await erc1155Transactions({ contract: token, address })
	});
};
