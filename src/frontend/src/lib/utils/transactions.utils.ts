import type { BtcTransactionUi } from '$btc/types/btc';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import { type BtcStatusesData } from '$icp/stores/btc.store';
import { type CkBtcPendingUtxosData } from '$icp/stores/ckbtc-utxos.store';
import { type CkBtcMinterInfoData } from '$icp/stores/ckbtc.store';
import { type IcPendingTransactionsData } from '$icp/stores/ic-pending-transactions.store';
import { type IcTransactionsData } from '$icp/stores/ic-transactions.store';
import { getCkBtcPendingUtxoTransactions } from '$icp/utils/ckbtc-transactions.utils';
import { getCkEthPendingTransactions } from '$icp/utils/cketh-transactions.utils';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import {
	extendIcTransaction,
	getAllIcTransactions,
	getIcExtendedTransactions
} from '$icp/utils/ic-transactions.utils';
import { MICRO_TRANSACTION_USD_THRESHOLD } from '$lib/constants/app.constants';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { ExchangesData } from '$lib/types/exchange';
import type { Token } from '$lib/types/token';
import type { AllTransactionUiWithCmp, AnyTransactionUi } from '$lib/types/transaction';
import type { TransactionsStoreCheckParams } from '$lib/types/transactions';
import { usdValue } from '$lib/utils/exchange.utils';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdICP,
	isNetworkIdSepolia,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import { isNullish, nonNullish } from '@dfinity/utils';

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
	$btcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>>;
	$ethTransactions: EthTransactionsData;
	$ckEthMinterInfo: CertifiedStoreData<CkEthMinterInfoData>;
	$ckBtcMinterInfoStore: CertifiedStoreData<CkBtcMinterInfoData>;
	$ethAddress: OptionEthAddress;
	$solTransactions: CertifiedStoreData<TransactionsData<SolTransactionUi>>;
	$btcStatuses: CertifiedStoreData<BtcStatusesData>;
	$icTransactionsStore: CertifiedStoreData<IcTransactionsData>;
	$ckBtcPendingUtxosStore: CertifiedStoreData<CkBtcPendingUtxosData>;
	$icPendingTransactionsStore: CertifiedStoreData<IcPendingTransactionsData>;
}): AllTransactionUiWithCmp[] => {
	const ckEthMinterInfoAddressesMainnet = toCkMinterInfoAddresses(
		$ckEthMinterInfo?.[ETHEREUM_TOKEN_ID]
	);

	const ckEthMinterInfoAddressesSepolia = toCkMinterInfoAddresses(
		$ckEthMinterInfo?.[SEPOLIA_TOKEN_ID]
	);

	return tokens.reduce<AllTransactionUiWithCmp[]>((acc, token) => {
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

		if (isNetworkIdEthereum(networkId)) {
			// TODO: remove Sepolia transactions when the feature is complete; for now we use it for testing
			const isSepoliaNetwork = isNetworkIdSepolia(networkId);

			return [
				...acc,
				...($ethTransactions[tokenId] ?? []).map((transaction) => ({
					transaction: mapEthTransactionUi({
						transaction,
						ckMinterInfoAddresses: isSepoliaNetwork
							? ckEthMinterInfoAddressesSepolia
							: ckEthMinterInfoAddressesMainnet,
						$ethAddress
					}),
					token,
					component: 'ethereum' as const
				}))
			];
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
};

//When using this filter function in combination with an infinite loader we need to make sure that the transactions are filtered while loading and not right before displaying them.
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

export const sortTransactions = ({
	transactionA: { timestamp: timestampA },
	transactionB: { timestamp: timestampB }
}: {
	transactionA: AnyTransactionUi;
	transactionB: AnyTransactionUi;
}): number => {
	if (nonNullish(timestampA) && nonNullish(timestampB)) {
		return (
			Number(normalizeTimestampToSeconds(timestampB)) -
			Number(normalizeTimestampToSeconds(timestampA))
		);
	}

	return nonNullish(timestampA) ? -1 : 1;
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
