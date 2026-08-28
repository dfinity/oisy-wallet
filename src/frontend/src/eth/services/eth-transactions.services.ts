import type { TokenId as BackendTokenId } from '$declarations/backend/backend.did';
import { ETHEREUM_NETWORK_SYMBOL } from '$env/networks/networks.eth.env';
import { USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED } from '$env/user-transactions.env';
import { enabledErc1155Tokens } from '$eth/derived/erc1155.derived';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { erc4626Tokens } from '$eth/derived/erc4626.derived';
import { enabledErc721Tokens } from '$eth/derived/erc721.derived';
import { etherscanProviders } from '$eth/providers/etherscan.providers';
import { infuraProviders } from '$eth/providers/infura.providers';
import {
	fetchErc20Transfers,
	loadErc20UserTransactions,
	loadNextErc20UserTransactions,
	persistableErc20Transfers,
	saveErc20FinalizedTransactions
} from '$eth/services/erc20-user-transactions.services';
import {
	getEthBackendPaginationCursor,
	loadEthUserTransactions,
	loadNextEthUserTransactions,
	saveEthFinalizedTransactions,
	setEthBackendAtCapacity,
	setEthBackendPaginationCursor
} from '$eth/services/eth-user-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import type { EthAddress } from '$eth/types/address';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import type { EthereumChainId } from '$eth/types/network';
import { isTokenErc1155 } from '$eth/utils/erc1155.utils';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isTokenErc4626 } from '$eth/utils/erc4626.utils';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
import { erc20BackendTokenId } from '$eth/utils/user-transactions.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { TRACK_COUNT_ETH_LOADING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.constants';
import { ZERO_ETH_ADDRESS } from '$lib/constants/app.constants';
import { ethAddress as addressStore } from '$lib/derived/address.derived';
import { trackEvent } from '$lib/services/analytics.services';
import { retryWithDelay } from '$lib/services/rest.services';
import { i18n } from '$lib/stores/i18n.store';
import type { Address } from '$lib/types/address';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TokenId, TokenStandard } from '$lib/types/token';
import type { Transaction } from '$lib/types/transaction';
import type { LoadOlderTransactions } from '$lib/types/transactions-pagination';
import type { ResultSuccess } from '$lib/types/utils';
import { last } from '$lib/utils/array.utils';
import { consoleError } from '$lib/utils/console.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNetworkEthereum } from '$lib/utils/network.utils';
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

const maxEthBlockNumberInStore = (tokenId: TokenId): number | undefined => {
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
 * The chain's latest block, or `undefined` when it cannot be read.
 *
 * Two callers want it: the incremental fetch skips the explorer entirely when the tip has not
 * moved past everything we already hold, and the save uses it as the reference the finality check
 * measures against.
 */
const readChainTip = async ({
	networkId
}: {
	networkId: NetworkId;
}): Promise<number | undefined> => {
	try {
		const { getBlockNumber } = infuraProviders(networkId);

		return await getBlockNumber();
	} catch (_: unknown) {
		return undefined;
	}
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

	const chainTip = await readChainTip({ networkId });

	// If we cannot read the tip, still query Etherscan rather than leave the UI stale.
	if (nonNullish(chainTip) && chainTip < startBlock) {
		return [];
	}

	return transactionsProvider({ address, startBlock, sort: 'desc' });
};

/**
 * Fetches ERC-20 transfers newer than what the backend cache and the store already hold, writes the
 * combined list to the store, and persists the finalized newcomers for the next session.
 *
 * The native counterpart is `loadEthTransactions`; the shapes are deliberately parallel.
 */
const loadCachedErc20Transactions = async ({
	identity,
	networkId,
	token,
	tokenId,
	address,
	updateOnly
}: {
	identity: NullishIdentity;
	networkId: NetworkId;
	token: Erc20Token;
	tokenId: TokenId;
	address: EthAddress;
	updateOnly: boolean;
}): Promise<void> => {
	const transactionTokenId = erc20BackendTokenId(token);

	const stored = USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED
		? await loadErc20UserTransactions({ identity, tokenId: transactionTokenId })
		: undefined;

	// Only while the list is being built from scratch. The periodic refresh comes through here too,
	// so resetting the cursor unconditionally would send the next scroll back over pages the user
	// already has.
	if (!hasStoredEthTransactions(tokenId)) {
		setEthBackendPaginationCursor({ tokenId, nextStart: stored?.nextStart });
	}

	setEthBackendAtCapacity({ tokenId, totalStored: stored?.totalStored });

	const startBlock = resolveEthIncrementalStartBlock({
		newestStoredBlockIndex: stored?.newestBlockIndex,
		maxBlockFromTransactionsStore: nonNullish(stored?.newestBlockIndex)
			? undefined
			: maxEthBlockNumberInStore(tokenId)
	});

	// One read serves both purposes below: skipping a fetch that cannot return anything, and giving
	// the finality check a real reference point rather than the batch's own newest block.
	const chainTip = await readChainTip({ networkId });

	const tipIsBehindWhatWeHold = startBlock > 0 && nonNullish(chainTip) && chainTip < startBlock;

	const { transactions: newTransactions, oldestUnresolvedBlockNumber } = tipIsBehindWhatWeHold
		? { transactions: [], oldestUnresolvedBlockNumber: undefined }
		: await fetchErc20Transfers({
				networkId,
				token,
				address,
				...(startBlock > 0 && { startBlock })
			});

	const certifiedTransactions = [...newTransactions, ...(stored?.transactions ?? [])].map(
		(transaction) => ({
			data: transaction,
			// We set the certified property to false because we don't have a way to certify ERC transactions for now.
			certified: false
		})
	);

	if (updateOnly) {
		certifiedTransactions.forEach((transaction) =>
			ethTransactionsStore.update({ tokenId, transaction })
		);
	} else {
		// Prepended rather than set, because this batch is not the whole history: it is the newest
		// stored page plus whatever is newer than it. Replacing the slot would throw away every older
		// page the user scrolled in.
		ethTransactionsStore.prepend({ tokenId, transactions: certifiedTransactions });
	}

	// Everything fetched is displayed; only what we persist is held back at an unresolved verdict.
	const persistable = persistableErc20Transfers({
		transactions: newTransactions,
		oldestUnresolvedBlockNumber
	});

	if (USER_TRANSACTIONS_LOAD_FROM_BACKEND_ENABLED && persistable.length > 0) {
		const blockNumbers = persistable.map(({ blockNumber }) => blockNumber).filter(nonNullish);
		const maxBlockNumber = blockNumbers.length > 0 ? Math.max(...blockNumbers) : 0;

		// The batch's own newest block under-states how far behind the chain the rest of it sits, so
		// measuring finality against it holds back transfers that are already final. Fall back to it
		// only when the tip could not be read, where being conservative beats persisting too early.
		const currentBlockNumber = chainTip ?? maxBlockNumber;

		if (maxBlockNumber > 0) {
			saveErc20FinalizedTransactions({
				identity,
				tokenId: transactionTokenId,
				transactions: persistable,
				currentBlockNumber
			}).catch((err) =>
				consoleError('Background save of finalized ERC-20 transactions failed:', err)
			);
		}
	}
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

		setEthBackendAtCapacity({ tokenId, totalStored: stored?.totalStored });

		const startBlock = resolveEthIncrementalStartBlock({
			newestStoredBlockIndex: stored?.newestBlockIndex,
			maxBlockFromTransactionsStore: nonNullish(stored?.newestBlockIndex)
				? undefined
				: maxEthBlockNumberInStore(tokenId)
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

	try {
		// ERC-20 is the only ERC standard backed by the canister cache, so it is the only one that
		// loads incrementally. The others still refetch their full history from Etherscan.
		if (isTokenErc20(token)) {
			await loadCachedErc20Transactions({
				identity,
				networkId,
				token,
				tokenId,
				address,
				updateOnly
			});

			return { success: true };
		}

		const transactions = isTokenErc4626(token)
			? await loadErc4626Transactions({ networkId, token, address })
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

/**
 * Loads ERC4626 vault token transactions and normalizes mint/burn addresses for UI/analytics.
 *
 * ERC4626 vaults emit standard ERC20 Transfer events for share minting/burning:
 * - Deposit (mint shares): Transfer(from=0x0, to=user, amount)
 * - Redeem (burn shares): Transfer(from=user, to=0x0, amount)
 *
 * On-chain, these represent supply changes between the user and the zero address, not transfers
 * to or from the vault's own balance.
 *
 * Since Etherscan's `tokentx` API returns the event's from/to (not the tx signer), we normalize
 * the zero address to the vault contract address in our transaction list so that:
 * - Mint: from=0x0 → from=vault (treated as vault-issued shares for display)
 * - Burn: to=0x0 → to=vault (treated as vault-received/burned shares for display)
 *
 * This is a presentation/analytics convention only; the underlying on-chain events still use
 * the zero address as the mint/burn counterparty.
 */
const loadErc4626Transactions = async ({
	networkId,
	token,
	address
}: {
	networkId: NetworkId;
	token: Erc4626CustomToken;
	address: Address;
}): Promise<Transaction[]> => {
	const { transactions } = await fetchErc20Transfers({ networkId, token, address });

	return transactions.map((tx) => {
		const isMint = tx.from.toLowerCase() === ZERO_ETH_ADDRESS;
		const isBurn = tx.to?.toLowerCase() === ZERO_ETH_ADDRESS;

		return {
			...tx,
			...(isMint ? { from: token.address } : {}),
			...(isBurn ? { to: token.address } : {})
		};
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

/**
 * Loads a page of ETH history older than what the token already has on screen.
 *
 * The ETH loaders page by block rather than by timestamp, so the floor is compared against the
 * oldest loaded transaction's own timestamp before deciding whether another page is wanted.
 */
export const loadNextEthTransactionsByOldest: LoadOlderTransactions = async ({
	token,
	identity,
	minTimestamp,
	signalEnd
}) => {
	const transactions = get(ethTransactionsStore)?.[token.id] ?? [];

	// If there are no transactions, we let the loader fetch the first ones
	if (transactions.length === 0) {
		return { success: false };
	}

	const oldest = last(transactions)?.data;

	// Without a floor the caller wants one page regardless, which is how the floor gets deeper.
	if (
		nonNullish(minTimestamp) &&
		nonNullish(oldest?.timestamp) &&
		normalizeTimestampToSeconds(oldest.timestamp) <= normalizeTimestampToSeconds(minTimestamp)
	) {
		return { success: false };
	}

	const oldestLoadedBlockNumber = oldest?.blockNumber;

	if (isNullish(oldestLoadedBlockNumber)) {
		return { success: false };
	}

	const address = get(addressStore);

	const { hasMore } = isTokenErc20(token)
		? await loadNextErc20UserTransactions({
				identity,
				address,
				transactionTokenId: erc20BackendTokenId(token),
				token,
				tokenId: token.id,
				networkId: token.network.id,
				oldestLoadedBlockNumber
			})
		: isTokenEthereumNative(token) && isNetworkEthereum(token.network)
			? await loadNextEthUserTransactions({
					identity,
					address,
					transactionTokenId: { EvmNative: token.network.chainId },
					tokenId: token.id,
					networkId: token.network.id,
					cursor: getEthBackendPaginationCursor(token.id),
					oldestLoadedBlockNumber
				})
			: { hasMore: false };

	if (!hasMore) {
		signalEnd();

		return { success: false };
	}

	// Unlike the ICP and Solana loaders these page by block and have no floor of their own, so the
	// only reliable stop is the store itself: a page that did not reach further back is the end,
	// whatever `hasMore` claims. Without this a repeated page would loop forever.
	const oldestAfter = last(get(ethTransactionsStore)?.[token.id] ?? [])?.data.blockNumber;

	if (isNullish(oldestAfter) || oldestAfter >= oldestLoadedBlockNumber) {
		signalEnd();

		return { success: false };
	}

	return { success: true };
};
