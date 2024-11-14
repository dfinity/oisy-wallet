import BtcTransaction from '$btc/components/transactions/BtcTransaction.svelte';
import type { BtcTransactionUi } from '$btc/types/btc';
import { ETHEREUM_NETWORK_ID, SEPOLIA_NETWORK_ID } from '$env/networks.env';
import { ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens.env';
import EthTransaction from '$eth/components/transactions/EthTransaction.svelte';
import type { EthTransactionsData } from '$eth/stores/eth-transactions.store';
import { mapEthTransactionUi } from '$eth/utils/transactions.utils';
import type { CkEthMinterInfoData } from '$icp-eth/stores/cketh.store';
import { toCkMinterInfoAddresses } from '$icp-eth/utils/cketh.utils';
import type { CertifiedStoreData } from '$lib/stores/certified.store';
import type { TransactionsData } from '$lib/stores/transactions.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { Token } from '$lib/types/token';
import type { AllTransactionsUi } from '$lib/types/transaction';
import {
	isNetworkIdBTCMainnet,
	isNetworkIdEthereum,
	isNetworkIdICP,
	isNetworkIdSepolia
} from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Maps the transactions stores to a unified list of transactions with their respective components.
 *
 * @param tokens - The tokens to map the transactions for.
 * @param $btcTransactions - The BTC transactions store data.
 * @param $ethTransactions - The ETH transactions store data.
 * @param $ckEthMinterInfo - The CK Ethereum minter info store data.
 * @param $ethAddress - The ETH address of the user.
 */
export const mapAllTransactionsUi = ({
	tokens,
	$btcTransactions,
	$ethTransactions,
	$ckEthMinterInfo,
	$ethAddress
}: {
	tokens: Token[];
	$btcTransactions: CertifiedStoreData<TransactionsData<BtcTransactionUi>>;
	$ethTransactions: EthTransactionsData;
	$ckEthMinterInfo: CertifiedStoreData<CkEthMinterInfoData>;
	$ethAddress: OptionEthAddress;
}): AllTransactionsUi =>
	tokens.reduce<AllTransactionsUi>((acc, { id: tokenId, network: { id: networkId } }) => {
		if (isNetworkIdBTCMainnet(networkId)) {
			if (isNullish($btcTransactions)) {
				return acc;
			}

			return [
				...acc,
				...($btcTransactions[tokenId] ?? []).map(({ data: transaction }) => ({
					...transaction,
					component: BtcTransaction
				}))
			];
		}

		if (isNetworkIdEthereum(networkId)) {
			const isSepoliaNetwork = isNetworkIdSepolia(networkId);

			return [
				...acc,
				...($ethTransactions[tokenId] ?? []).map((transaction) => ({
					...mapEthTransactionUi({
						transaction,
						ckMinterInfoAddresses: toCkMinterInfoAddresses({
							minterInfo:
								$ckEthMinterInfo?.[isSepoliaNetwork ? SEPOLIA_TOKEN_ID : ETHEREUM_TOKEN_ID],
							networkId: isSepoliaNetwork ? SEPOLIA_NETWORK_ID : ETHEREUM_NETWORK_ID
						}),
						$ethAddress: $ethAddress
					}),
					component: EthTransaction
				}))
			];
		}

		if (isNetworkIdICP(networkId)) {
			// TODO: Implement ICP transactions
			return acc;
		}

		return acc;
	}, []);
