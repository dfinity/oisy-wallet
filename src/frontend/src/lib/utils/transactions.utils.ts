import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import IcTransaction from '$icp/components/transactions/IcTransaction.svelte';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { extendIcTransaction } from '$icp/utils/ic-transactions.utils';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { AllTransactionUi, AnyTransactionUi } from '$lib/types/transaction';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdICP,
	isNetworkIdSepolia
} from '$lib/utils/network.utils';
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
 * @param $btcStatuses - The BTC statuses store data.
 * @returns The unified list of transactions with their respective token and components.
 */
export const mapAllTransactionsUi = ({
	tokens,
	$btcTransactions,
	$ethTransactions,
	$ckEthMinterInfo,
	$ethAddress,
	$icTransactions,
	$btcStatuses
}: {
	tokens: Token[];
	$btcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>>;
	$ethTransactions: EthTransactionsData;
	$ckEthMinterInfo: CertifiedStoreData<CkEthMinterInfoData>;
	$ethAddress: OptionEthAddress;
	$icTransactions: CertifiedStoreData<TransactionsData<IcTransactionUi>>;
	$btcStatuses: CertifiedStoreData<BtcStatusesData>;
}): AllTransactionUi[] => {
	const ckEthMinterInfoAddressesMainnet = toCkMinterInfoAddresses({
		minterInfo: $ckEthMinterInfo?.[ETHEREUM_TOKEN_ID],
		networkId: ETHEREUM_NETWORK_ID
	});

	const ckEthMinterInfoAddressesSepolia = toCkMinterInfoAddresses({
		minterInfo: $ckEthMinterInfo?.[SEPOLIA_TOKEN_ID],
		networkId: SEPOLIA_NETWORK_ID
	});

	return tokens.reduce<AllTransactionUi[]>((acc, token) => {
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
					...transaction,
					token,
					component: BtcTransaction
				}))
			];
		}

		if (isNetworkIdEthereum(networkId)) {
			// TODO: remove Sepolia transactions when the feature is complete; for now we use it for testing
			const isSepoliaNetwork = isNetworkIdSepolia(networkId);

			return [
				...acc,
				...($ethTransactions[tokenId] ?? []).map((transaction) => ({
					...mapEthTransactionUi({
						transaction,
						ckMinterInfoAddresses: isSepoliaNetwork
							? ckEthMinterInfoAddressesSepolia
							: ckEthMinterInfoAddressesMainnet,
						$ethAddress: $ethAddress
					}),
					token,
					component: EthTransaction
				}))
			];
		}

		if (isNetworkIdICP(networkId)) {
			// TODO: Implement ckBTC and ckETH pending transactions

			if (isNullish($icTransactions)) {
				return acc;
			}

			return [
				...acc,
				...($icTransactions[tokenId] ?? []).map((transaction) => ({
					...extendIcTransaction({
						transaction,
						token,
						btcStatuses: $btcStatuses?.[tokenId] ?? undefined
					}).data,
					token,
					component: IcTransaction
				}))
			];
		}

		return acc;
	}, []);
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

	return nonNullish(timestampA) ? 1 : -1;
};
