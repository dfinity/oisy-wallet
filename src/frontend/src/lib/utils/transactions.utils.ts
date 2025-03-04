import type { BtcTransactionUi } from '$btc/types/btc';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import type { BtcStatusesData } from '$icp/stores/btc.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { normalizeTimestampToSeconds } from '$icp/utils/date.utils';
import { extendIcTransaction } from '$icp/utils/ic-transactions.utils';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { AllTransactionUiWithCmp, AnyTransactionUi } from '$lib/types/transaction';
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
	$ethAddress,
	$icTransactions,
	$solTransactions,
	$btcStatuses
}: {
	tokens: Token[];
	$btcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>>;
	$ethTransactions: EthTransactionsData;
	$ckEthMinterInfo: CertifiedStoreData<CkEthMinterInfoData>;
	$ethAddress: OptionEthAddress;
	$icTransactions: CertifiedStoreData<TransactionsData<IcTransactionUi>>;
	$solTransactions: CertifiedStoreData<TransactionsData<SolTransactionUi>>;
	$btcStatuses: CertifiedStoreData<BtcStatusesData>;
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
						$ethAddress: $ethAddress
					}),
					token,
					component: 'ethereum' as const
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
