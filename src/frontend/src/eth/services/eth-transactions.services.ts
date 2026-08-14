import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED } from '$env/user-transactions.env';
import { enabledErc1155Tokens } from '$eth/derived/erc1155.derived';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import { enabledErc721Tokens } from '$eth/derived/erc721.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import { fetchErc20Transfers } from '$eth/services/erc-transfers.services';
import {
	loadEthUserTransactions,
	saveEthFinalizedTransactions,
	setEthBackendPaginationCursor
} from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { EthereumChainId } from '$eth/types/network';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626, normalizeErc4626MintBurnTransfers } from '$eth/utils/erc4626.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { toBackendTokenId } from '$eth/utils/user-transactions.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.constants';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import { trackEvent } from '$lib/services/analytics.services';
import { retryWithDelay } from '$lib/services/rest.services';
import { i18n } from '$lib/stores/i18n.store';
import type { Address } from '$lib/types/address';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TokenId, TokenStandard } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadEthereumTransactions = ({
	identity,
	networkId,
	tokenId,
	chainId,
	standard,
	updateOnly = false,
	silent = false
}: {
	identity: NullishIdentity;
	tokenId: TokenId;
	networkId: NetworkId;
	chainId: EthereumChainId;
	standard: TokenStandard;
	updateOnly?: boolean;
	silent?: boolean;
}): Promise<ResultSuccess> => {
	if (isSupportedEthTokenId(tokenId) || isSupportedEvmNativeTokenId(tokenId)) {
		return loadEthTransactions({ identity, networkId, tokenId, chainId, updateOnly, silent });
	}

	return loadErcTransactions({ identity, networkId, tokenId, standard, updateOnly });
};

// If we use the update method instead of the set method, we can keep the existing transactions and just update their data.
// Plus, we add new transactions to the existing ones.
export const reloadEthereumTransactions = (params: {
	identity: NullishIdentity;
	tokenId: TokenId;
	networkId: NetworkId;
	chainId: EthereumChainId;
	standard: TokenStandard;
	silent?: boolean;
}): Promise<ResultSuccess> => loadEthereumTransactions({ ...params, updateOnly: true });

const hasStoredEthTransactions = (tokenId: TokenId): boolean =>
	(get(ethTransactionsStore)?.[tokenId] ?? []).length > 0;

const maxBlockNumberInStore = (tokenId: TokenId): number | undefined => {
	const rows = get(ethTransactionsStore)?.[tokenId];

	if (isNullish(rows) || rows.length === 0) {
		return;
	}

	const blocks = rows.map(({ data }) => data.blockNumber).filter(nonNullish);

	if (blocks.length === 0) {
		return;
	}

	return Math.max(...blocks);
};

/**
 * Next Etherscan `startBlock` after the newest known height; backend cursor wins over the store.
 */
const resolveEthIncrementalStartBlock = ({
	newestStoredBlockIndex,
	maxBlockFromTransactionsStore
}: {
	newestStoredBlockIndex: bigint | undefined;
	maxBlockFromTransactionsStore: number | undefined;
}): number => {
	if (nonNullish(newestStoredBlockIndex)) {
		return Number(newestStoredBlockIndex) + 1;
	}

	if (nonNullish(maxBlockFromTransactionsStore)) {
		return maxBlockFromTransactionsStore + 1;
	}

	return 0;
};

/**
 * Fetches native ETH history from Etherscan after `startBlock` (exclusive lower bound in API terms).
 * For incremental loads, skips the request when Infura reports the chain tip is still below `startBlock`.
 */
const loadNewEthNativeTransactionsAfterStartBlock = async ({
	networkId,
	address,
	startBlock
}: {
	networkId: NetworkId;
	address: Address;
	startBlock: number;
}): Promise<Transaction[]> => {
	const { transactions: transactionsProvider } = etherscanProviders(networkId);

	if (startBlock === 0) {
		return transactionsProvider({ address, startBlock: 0, sort: 'desc' });
	}

	const tipReachesStartBlock = await (async (): Promise<boolean> => {
		try {
			const { getBlockNumber } = infuraProviders(networkId);

			const latestBlockNumber = await getBlockNumber();

			return latestBlockNumber >= startBlock;
		} catch (_: unknown) {
			// If we cannot read the tip, still query Etherscan rather than leave the UI stale.
			return true;
		}
	})();

	if (!tipReachesStartBlock) {
		return [];
	}

	return transactionsProvider({ address, startBlock, sort: 'desc' });
};

const loadEthTransactions = async ({
	identity,
	networkId,
	tokenId,
	chainId,
	updateOnly = false,
	silent = false
}: {
	identity: NullishIdentity;
	networkId: NetworkId;
	tokenId: TokenId;
	chainId: EthereumChainId;
	updateOnly?: boolean;
	silent?: boolean;
}): Promise<ResultSuccess> => {
	const address = get(addressStore);

	if (isNullish(address)) {
		return { success: false };
	}

	try {
		const transactionTokenId: BackendTokenId = { EvmNative: chainId };

		const stored = USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED
			? await loadEthUserTransactions({ identity, tokenId: transactionTokenId })
			: undefined;

		// Only while the list is being built from scratch. The periodic refresh comes through here too,
		// so resetting the cursor unconditionally would send the next scroll back over pages the user
		// already has.
		if (!hasStoredEthTransactions(tokenId)) {
			setEthBackendPaginationCursor({ tokenId, nextStart: stored?.nextStart });
		}

		const startBlock = resolveEthIncrementalStartBlock({
			newestStoredBlockIndex: stored?.newestBlockIndex,
			maxBlockFromTransactionsStore: nonNullish(stored?.newestBlockIndex)
				? undefined
				: maxBlockNumberInStore(tokenId)
		});

		const newTransactions = await loadNewEthNativeTransactionsAfterStartBlock({
			networkId,
			address,
			startBlock
		});

		// Combine newest-first: new transactions (desc) then stored (desc from backend)
		const allTransactions = [...newTransactions, ...(stored?.transactions ?? [])];

		const certifiedTransactions = allTransactions.map((transaction) => ({
			data: transaction,
			// We set the certified property to false because we don't have a way to certify ETH transactions for now.
			certified: false
		}));

		if (updateOnly) {
			certifiedTransactions.forEach((transaction) =>
				ethTransactionsStore.update({ tokenId, transaction })
			);
		} else {
			// Prepended rather than set, because this batch is not the whole history: it is the newest
			// stored page plus whatever is newer than it. Replacing the slot would throw away every older
			// page the user scrolled in - and the periodic refresh runs through here every 30 seconds.
			ethTransactionsStore.prepend({ tokenId, transactions: certifiedTransactions });
		}

		// Save newly finalized transactions to backend (fire-and-forget).
		// We use the highest block number in the batch as the "tip" for finality checks.
		// This means only transactions at least ETH_FINALITY_BLOCKS behind this tip will
		// be saved — the most recent transactions in the batch will be saved on a future load.
		if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && newTransactions.length > 0) {
			const blockNumbers = newTransactions.map((tx) => tx.blockNumber).filter(nonNullish);
			const maxBlockNumber = blockNumbers.length > 0 ? Math.max(...blockNumbers) : 0;

			if (maxBlockNumber > 0) {
				saveEthFinalizedTransactions({
					identity,
					tokenId: transactionTokenId,
					transactions: newTransactions,
					currentBlockNumber: maxBlockNumber
				}).catch((err) => consoleError('Background save of finalized transactions failed:', err));
			}
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
	identity,
	networkId,
	tokenId,
	standard,
	updateOnly = false
}: {
	identity: NullishIdentity;
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
		...get(erc4626Tokens),
		...get(enabledErc1155Tokens)
	];
	const token = tokens.find(
		({ id, network, standard: tokenStandard }) =>
			id === tokenId && network.id === networkId && tokenStandard === standard
	);

	if (isNullish(token)) {
		return { success: false };
	}

	// Non-fungible transfers come from endpoints this path does not store, so they keep fetching their
	// whole history every time - and must not pick up an incremental start block from the store.
	const transactionTokenId = toBackendTokenId(token);
	const cached = USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && nonNullish(transactionTokenId);

	try {
		const stored = cached
			? await loadEthUserTransactions({ identity, tokenId: transactionTokenId })
			: undefined;

		// Only while the list is being built from scratch. The periodic refresh comes through here too,
		// so resetting the cursor unconditionally would send the next scroll back over pages the user
		// already has.
		if (cached && !hasStoredEthTransactions(tokenId)) {
			setEthBackendPaginationCursor({ tokenId, nextStart: stored?.nextStart });
		}

		const startBlock = cached
			? resolveEthIncrementalStartBlock({
					newestStoredBlockIndex: stored?.newestBlockIndex,
					maxBlockFromTransactionsStore: nonNullish(stored?.newestBlockIndex)
						? undefined
						: maxBlockNumberInStore(tokenId)
				})
			: 0;

		const fetched =
			isTokenErc4626(token) || isTokenErc20(token)
				? await fetchErc20Transfers({ networkId, token, address, startBlock })
				: isTokenErc721(token)
					? await loadErc721Transactions({ networkId, token, address })
					: isTokenErc1155(token)
						? await loadErc1155Transactions({ networkId, token, address })
						: [];

		// Combine newest-first: new transactions (desc) then stored (desc from backend)
		const allTransactions = [...fetched, ...(stored?.transactions ?? [])];

		// Applied here rather than on the fetched rows alone, because stored rows are held as the chain
		// reported them - see `normalizeErc4626MintBurnTransfers`.
		const displayedTransactions = isTokenErc4626(token)
			? normalizeErc4626MintBurnTransfers({
					transactions: allTransactions,
					vaultAddress: token.address
				})
			: allTransactions;

		const certifiedTransactions = displayedTransactions.map((transaction) => ({
			data: transaction,
			// We set the certified property to false because we don't have a way to certify ERC transactions for now.
			certified: false
		}));

		if (updateOnly) {
			certifiedTransactions.forEach((transaction) =>
				ethTransactionsStore.update({ tokenId, transaction })
			);
		} else if (cached) {
			// Prepended rather than set, because once a token is cached this batch is not the whole
			// history: it is the newest stored page plus whatever is newer than it. Replacing the slot
			// would throw away every older page the user scrolled in - and the periodic refresh runs
			// through here every 30 seconds.
			ethTransactionsStore.prepend({ tokenId, transactions: certifiedTransactions });
		} else {
			// Collectibles still fetch their whole history every time, so replacing the slot is a real
			// refresh and drops what the chain no longer reports.
			ethTransactionsStore.set({ tokenId, transactions: certifiedTransactions });
		}

		// Saved as fetched, before the vault normalisation, so the backend holds what the chain reported.
		if (cached && fetched.length > 0) {
			const blockNumbers = fetched.map(({ blockNumber }) => blockNumber).filter(nonNullish);
			const maxBlockNumber = blockNumbers.length > 0 ? Math.max(...blockNumbers) : 0;

			if (maxBlockNumber > 0) {
				saveEthFinalizedTransactions({
					identity,
					tokenId: transactionTokenId,
					transactions: fetched,
					currentBlockNumber: maxBlockNumber
				}).catch((err) => consoleError('Background save of finalized transactions failed:', err));
			}
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
