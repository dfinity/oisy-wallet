import type { BtcCertifiedTransactionsData } from '$btc/stores/btc-transactions.store';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import type { EthCertifiedTransactionsData } from '$eth/stores/eth-transactions.store';
import type { OptionEthAddress } from '$eth/types/address';
import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
import {
	groupEthTransactionsByNetworkAndHash,
	mapEthTransactionUi
} from '$eth/utils/transactions.utils';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { CkBtcPendingUtxosData } from '$icp/stores/ckbtc-utxos.store';
import type { CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import type { IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import type { IcCertifiedTransactionsData } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { getCkBtcPendingUtxoTransactions } from '$icp/utils/ckbtc-transactions.utils';
import { getCkEthPendingTransactions } from '$icp/utils/cketh-transactions.utils';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import {
	extendIcTransaction,
	getAllIcTransactions,
	getIcExtendedTransactions
} from '$icp/utils/ic-transactions.utils';
import { MICRO_TRANSACTION_USD_THRESHOLD, ZERO } from '$lib/constants/app.constants';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import type {
	AllTransactionUiWithCmp,
	AnyTransactionUi,
	AnyTransactionUiWithToken,
	EthAllTransactionUiWithCmp
} from '$lib/types/transaction-ui';
import type { KnownDestinations, TransactionsStoreCheckParams } from '$lib/types/transactions';
import { last } from '$lib/utils/array.utils';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdEvm,
	isNetworkIdICP,
	isNetworkIdSepolia,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import type { SolCertifiedTransactionsData } from '$sol/stores/sol-transactions.store';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Finds EVM/ETH native-token transactions that are duplicates of non-native transactions
 * sharing the same hash on the same network.
 *
 * For deposit/transfer operations, two transactions are received: the ERC token transfer
 * and the native fee payment. This identifies the native fee entries to exclude.
 */
const findDuplicateEthNativeTransactions = (
	ethTransactions: EthAllTransactionUiWithCmp[]
): Set<EthAllTransactionUiWithCmp> => {
	const groupsByNetworkAndHash = groupEthTransactionsByNetworkAndHash({
		items: ethTransactions,
		networkId: ({ token: { network } }) => network.id,
		hash: ({ transaction }) => transaction.hash
	});

	// For each group with duplicates, mark native fee entries for removal
	// only when the group also contains at least one non-native (e.g. ERC-20) transfer.
	const duplicates = new Set<EthAllTransactionUiWithCmp>();

	for (const networkMap of groupsByNetworkAndHash.values()) {
		for (const group of networkMap.values()) {
			if (group.length > 1) {
				const hasNonNative = group.some(({ token }) => !isTokenEthereumNative(token));

				if (hasNonNative) {
					for (const tx of group) {
						// Only the zero-value native entry is a duplicate: the gas/fee companion that
						// block explorers return alongside an ERC-20 transfer. A native entry that moved
						// value is a real leg — e.g. the native input of a native→token swap — and must
						// stay next to the token leg instead of being collapsed into it.
						if (isTokenEthereumNative(tx.token) && tx.transaction.value === ZERO) {
							duplicates.add(tx);
						}
					}
				}
			}
		}
	}

	return duplicates;
};

/**
 * Maps the transactions stores to a unified list of transactions with their respective token and components.
 *
 * @param tokens - The tokens to map the transactions for.
 * @param $btcTransactions - The BTC transactions store data.
 * @param $ethTransactions - The ETH transactions store data.
 * @param $ckEthMinterInfo - The CK Ethereum minter info store data.
 * @param $ethAddress - The ETH address of the user.
 * @param $icTransactions - The ICP transactions store data.
 * @param $solTransactions - The SOL transactions store data.
 * @param $btcStatuses - The BTC statuses store data.
 * @returns The unified list of transactions with their respective token and components.
 */
export const mapAllTransactionsUi = ({
	tokens,
	$btcTransactions,
	$ethTransactions,
	$ckEthMinterInfo,
	$ckBtcMinterInfoStore,
	$ethAddress,
	$solTransactions,
	$btcStatuses,
	$icTransactionsStore,
	$ckBtcPendingUtxosStore,
	$icPendingTransactionsStore
}: {
	tokens: Token[];
	$btcTransactions: BtcCertifiedTransactionsData;
	$ethTransactions: EthCertifiedTransactionsData;
	$ckEthMinterInfo: CertifiedStoreData<CkEthMinterInfoData>;
	$ckBtcMinterInfoStore: CertifiedStoreData<CkBtcMinterInfoData>;
	$ethAddress: OptionEthAddress;
	$solTransactions: SolCertifiedTransactionsData;
	$btcStatuses: CertifiedStoreData<BtcStatusesData>;
	$icTransactionsStore: IcCertifiedTransactionsData;
	$ckBtcPendingUtxosStore: CertifiedStoreData<CkBtcPendingUtxosData>;
	$icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}): AllTransactionUiWithCmp[] => {
	const ckEthMinterInfoAddressesMainnet = toCkMinterInfoAddresses(
		$ckEthMinterInfo?.[ETHEREUM_TOKEN_ID]
	);

	const ckEthMinterInfoAddressesSepolia = toCkMinterInfoAddresses(
		$ckEthMinterInfo?.[SEPOLIA_TOKEN_ID]
	);

	// Collected separately to scope deduplication only to ETH/EVM transactions.
	const ethTransactions: EthAllTransactionUiWithCmp[] = [];

	const allTransactions = tokens.reduce<AllTransactionUiWithCmp[]>((acc, token) => {
		const {
			id: tokenId,
			network: { id: networkId }
		} = token;

		if (isNetworkIdBTCMainnet(networkId)) {
			if (isNullish($btcTransactions)) {
				return acc;
			}

			return [
				...acc,
				...($btcTransactions[tokenId] ?? []).map(({ data: transaction }) => ({
					transaction,
					token,
					component: 'bitcoin' as const
				}))
			];
		}

		if (isNetworkIdEthereum(networkId) || isNetworkIdEvm(networkId)) {
			const isSepoliaNetwork = isNetworkIdSepolia(networkId);

			const mapped = ($ethTransactions?.[tokenId] ?? []).map(({ data: transaction }) => ({
				transaction: mapEthTransactionUi({
					transaction,
					ckMinterInfoAddresses: isSepoliaNetwork
						? ckEthMinterInfoAddressesSepolia
						: ckEthMinterInfoAddressesMainnet,
					ethAddress: $ethAddress
				}),
				token,
				component: 'ethereum' as const
			}));

			ethTransactions.push(...mapped);

			return [...acc, ...mapped];
		}

		if (isNetworkIdICP(networkId)) {
			const $icTransactions = getAllIcTransactions({
				token,
				icTransactionsStore: $icTransactionsStore,
				btcStatusesStore: $btcStatuses,
				ckBtcMinterInfoStore: $ckBtcMinterInfoStore,
				ckBtcPendingUtxosStore: $ckBtcPendingUtxosStore,
				icPendingTransactionsStore: $icPendingTransactionsStore,
				ckEthPendingTransactions: getCkEthPendingTransactions({
					token,
					icPendingTransactionsStore: $icPendingTransactionsStore
				}),
				ckBtcPendingUtxoTransactions: getCkBtcPendingUtxoTransactions({
					token,
					ckBtcPendingUtxosStore: $ckBtcPendingUtxosStore,
					ckBtcMinterInfoStore: $ckBtcMinterInfoStore
				}),
				icExtendedTransactions: getIcExtendedTransactions({
					token,
					icTransactionsStore: $icTransactionsStore,
					btcStatusesStore: $btcStatuses
				})
			});

			if (isNullish($icTransactions)) {
				return acc;
			}

			return [
				...acc,
				...($icTransactions ?? []).map((transaction) => ({
					transaction: extendIcTransaction({
						transaction,
						token,
						btcStatuses: $btcStatuses?.[tokenId] ?? undefined
					}).data,
					token,
					component: 'ic' as const
				}))
			];
		}

		if (isNetworkIdSolana(networkId)) {
			if (isNullish($solTransactions)) {
				return acc;
			}

			return [
				...acc,
				...($solTransactions[tokenId] ?? []).map(({ data: transaction }) => ({
					transaction,
					token,
					component: 'solana' as const
				}))
			];
		}

		return acc;
	}, []);

	// Remove native ETH/EVM transactions that duplicate an ERC token transfer on the same network and hash.
	const duplicates = findDuplicateEthNativeTransactions(ethTransactions);

	const withoutEthDuplicates =
		duplicates.size > 0
			? allTransactions.filter((tx) => !duplicates.has(tx as EthAllTransactionUiWithCmp))
			: allTransactions;

	return dropDuplicateSolTransactions(withoutEthDuplicates);
};

/**
 * One Solana record per signature lives in the store of every token the transaction touched, and
 * the merged list keeps one row per token it moved.
 *
 * A swap is deliberately two rows, one per side, because each carries its own token's icon and
 * balance change and a user scanning for a token wants to find it on the row that names it. What
 * gets dropped is the rest: the tokens a transaction merely brushed, where a send that opened an
 * account would otherwise appear again under SOL for the rent alone.
 */
const dropDuplicateSolTransactions = (
	transactions: AllTransactionUiWithCmp[]
): AllTransactionUiWithCmp[] => {
	const groups = transactions.reduce<Map<string, AllTransactionUiWithCmp[]>>((acc, entry) => {
		if (entry.component !== 'solana') {
			return acc;
		}

		// Keyed by signature, which is what makes two rows the same transaction. The id is the
		// signature for a record this redesign derived, but a record cached before it carries a
		// per-instruction id, and grouping on that would leave its duplicates in place.
		const key = String((entry.transaction as SolTransactionUi).signature ?? entry.transaction.id);
		const group = acc.get(key);

		if (nonNullish(group)) {
			group.push(entry);
		} else {
			acc.set(key, [entry]);
		}

		return acc;
	}, new Map());

	const drop = new Set<AllTransactionUiWithCmp>();

	groups.forEach((group) => {
		if (group.length < 2) {
			return;
		}

		const [{ transaction }] = group;
		const { summary } = transaction as SolTransactionUi;

		// The tokens the transaction is about: both sides of a swap, the single side of everything
		// else. A token outside this set was only brushed, and its row would describe nothing.
		const stated = [summary?.spent, summary?.received].filter(nonNullish);

		// A transaction OISY could not reduce still moved what it moved, and it earns a row per
		// token exactly as a swap does. Without this it kept one row, arbitrarily the first, which
		// said "Interaction" over an amount belonging to whichever token happened to come first.
		//
		// The net of a token that only paid the fee is zero, so the fee alone never earns a row.
		const subjects =
			stated.length > 0
				? stated
				: ((transaction as SolTransactionUi).netChanges ?? []).filter(
						({ delta }) => delta !== ZERO
					);

		// One row per subject, matched to the token that names it. A subject the merged list has no
		// row for simply yields none.
		const kept = subjects.reduce<AllTransactionUiWithCmp[]>((acc, { tokenAddress }) => {
			const match = group.find(
				(entry) =>
					!acc.includes(entry) &&
					(isNullish(tokenAddress)
						? !isTokenSpl(entry.token)
						: isTokenSpl(entry.token) && entry.token.address === tokenAddress)
			);

			return nonNullish(match) ? [...acc, match] : acc;
		}, []);

		const survivors = kept.length > 0 ? kept : [group[0]];

		group.forEach((entry) => {
			if (!survivors.includes(entry)) {
				drop.add(entry);
			}
		});
	});

	return drop.size > 0 ? transactions.filter((entry) => !drop.has(entry)) : transactions;
};

// When using this filter function in combination with an infinite loader we need to make sure that the transactions are filtered while loading and not right before displaying them.
export const filterReceivedMicroTransactions = ({
	transactions,
	exchanges
}: {
	transactions: AllTransactionUiWithCmp[];
	exchanges: ExchangesData;
}): AllTransactionUiWithCmp[] =>
	transactions.filter((transactionUI) => {
		const { transaction } = transactionUI;
		return !(transaction.type === 'receive' && isMicroTransaction({ transactionUI, exchanges }));
	});

export const getReceivedMicroTransactions = ({
	transactions,
	exchanges
}: {
	transactions: AllTransactionUiWithCmp[];
	exchanges: ExchangesData;
}): AllTransactionUiWithCmp[] =>
	transactions.filter((transactionUI) => {
		const { transaction } = transactionUI;
		return transaction.type === 'receive' && isMicroTransaction({ transactionUI, exchanges });
	});

const isMicroTransaction = ({
	transactionUI,
	exchanges
}: {
	transactionUI: AllTransactionUiWithCmp;
	exchanges: ExchangesData;
}) => {
	const { token, transaction } = transactionUI;
	if (nonNullish(transaction.value)) {
		const exchangeRate = exchanges?.[token.id]?.usd;
		if (nonNullish(exchangeRate)) {
			const usdAmount = usdValue({
				decimals: token.decimals,
				balance: transaction.value,
				exchangeRate
			});
			return usdAmount < MICRO_TRANSACTION_USD_THRESHOLD;
		}
	}

	return false;
};

// Ranks transaction types for the same-timestamp tie-breaker in `sortTransactions`: the received
// leg of a pair sorts above the sent one; any other type keeps a stable position after them.
const sameTimestampTypeRank = (type: AnyTransactionUi['type']): number => {
	if (type === 'receive') {
		return 0;
	}

	if (type === 'send') {
		return 1;
	}

	return 2;
};

export const sortTransactions = ({
	transactionA: { timestamp: timestampA, type: typeA },
	transactionB: { timestamp: timestampB, type: typeB }
}: {
	transactionA: AnyTransactionUi;
	transactionB: AnyTransactionUi;
}): number => {
	if (nonNullish(timestampA) && nonNullish(timestampB)) {
		const bySeconds =
			Number(normalizeTimestampToSeconds(timestampB)) -
			Number(normalizeTimestampToSeconds(timestampA));

		// The two legs of one operation (a swap, or a self-transfer) share the same block timestamp
		// and tie here. Break the tie deterministically — received leg above the sent one — so these
		// pairs render consistently instead of in an arbitrary insertion order.
		return bySeconds !== 0
			? bySeconds
			: sameTimestampTypeRank(typeA) - sameTimestampTypeRank(typeB);
	}

	if (nonNullish(timestampA)) {
		return -1;
	}

	return nonNullish(timestampB) ? 1 : 0;
};

export const isTransactionsStoreInitialized = ({
	transactionsStoreData,
	tokens
}: TransactionsStoreCheckParams): boolean =>
	tokens.every(({ id }) => transactionsStoreData?.[id] !== undefined);

export const isTransactionsStoreNotInitialized = (params: TransactionsStoreCheckParams): boolean =>
	!isTransactionsStoreInitialized(params);

export const isTransactionsStoreEmpty = ({
	transactionsStoreData,
	tokens
}: TransactionsStoreCheckParams): boolean =>
	tokens.every(
		({ id }) => isNullish(transactionsStoreData?.[id]) || transactionsStoreData?.[id]?.length === 0
	);

export const areTransactionsStoresLoading = (
	transactionsStores: TransactionsStoreCheckParams[]
): boolean => {
	const { someNullish, someNotInitialized, allEmpty } = transactionsStores.reduce<{
		someNullish: boolean;
		someNotInitialized: boolean;
		allEmpty: boolean;
	}>(
		({ someNullish, someNotInitialized, allEmpty }, { transactionsStoreData, tokens }) => ({
			someNullish: someNullish || isNullish(transactionsStoreData),
			someNotInitialized:
				someNotInitialized || isTransactionsStoreNotInitialized({ transactionsStoreData, tokens }),
			allEmpty: allEmpty && isTransactionsStoreEmpty({ transactionsStoreData, tokens })
		}),
		{ someNullish: false, someNotInitialized: false, allEmpty: true }
	);

	return (someNullish || someNotInitialized) && allEmpty;
};

export const areTransactionsStoresLoaded = (
	transactionsStores: TransactionsStoreCheckParams[]
): boolean =>
	transactionsStores.length > 0 &&
	transactionsStores.every((transactionsStore) =>
		isTransactionsStoreInitialized(transactionsStore)
	);

export const getKnownDestinations = (
	transactions: AnyTransactionUiWithToken[]
): KnownDestinations =>
	transactions.reduce<KnownDestinations>(
		(acc, { timestamp, value, to, type, token }) =>
			nonNullish(to) && type === 'send' && nonNullish(value) && value > ZERO
				? {
						...acc,
						...(Array.isArray(to) ? to : [to]).reduce(
							(innerAcc, address) => ({
								...innerAcc,
								[address]: {
									amounts: [
										...(nonNullish(acc[address]) ? acc[address].amounts : []),
										{ value, token }
									],
									timestamp:
										nonNullish(acc[address]?.timestamp) && nonNullish(timestamp)
											? Math.max(Number(acc[address].timestamp), Number(timestamp))
											: nonNullish(timestamp)
												? Number(timestamp)
												: acc[address].timestamp,
									address
								}
							}),
							{}
						)
					}
				: acc,
		{}
	);

/**
 * Finds the oldest transaction in a newest-first transaction store.
 *
 * @param transactions - The list of transactions to search through.
 * @returns The last transaction or undefined if no transactions are provided.
 */
export const findOldestTransaction = <T extends IcTransactionUi | SolTransactionUi>(
	transactions: T[]
): T | undefined => last(transactions);
