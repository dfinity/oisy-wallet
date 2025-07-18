import {
	CKERC20_HELPER_CONTRACT_SIGNATURE,
	CKETH_HELPER_CONTRACT_SIGNATURE
} from '$env/networks/networks.cketh.env';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import type { Erc20Token } from '$eth/types/erc20';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { tokenAddressToHex } from '$eth/utils/token.utils';
import {
	mapCkErc20PendingTransaction,
	mapCkEthPendingTransaction,
	type MapCkEthereumPendingTransactionParams
} from '$icp-eth/utils/cketh-transactions.utils';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcCkLinkedAssets, IcToken } from '$icp/types/ic-token';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { TRACK_COUNT_ETH_PENDING_TRANSACTIONS_ERROR } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { EthAddress } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TransactionResponseWithBigInt } from '$lib/types/transaction';
import { emit } from '$lib/utils/events.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Log } from 'ethers/providers';
import { get } from 'svelte/store';

export const loadCkEthereumPendingTransactions = async ({
	twinToken,
	...rest
}: {
	toAddress: EthAddress;
	token: IcToken;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkLinkedAssets) => {
	const { id: twinTokenId } = twinToken;

	if (isSupportedEthTokenId(twinTokenId)) {
		await loadCkETHPendingTransactions({
			twinToken,
			...rest
		});
		return;
	}

	await loadCkErc20PendingTransactions({
		twinToken,
		...rest
	});
};

const loadCkETHPendingTransactions = async ({
	toAddress,
	twinToken,
	...rest
}: {
	toAddress: EthAddress;
	token: IcToken;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkLinkedAssets) => {
	const logsTopics = (to: EthAddress): (string | null)[] => [
		CKETH_HELPER_CONTRACT_SIGNATURE,
		null,
		to
	];

	await loadPendingTransactions({
		toAddress,
		twinToken,
		logsTopics,
		mapPendingTransaction: mapCkEthPendingTransaction,
		...rest
	});
};

const loadCkErc20PendingTransactions = async ({
	toAddress,
	twinToken,
	...rest
}: {
	toAddress: EthAddress;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
	token: IcToken;
} & IcCkLinkedAssets) => {
	const logsTopics = (to: EthAddress): (string | null)[] => [
		CKERC20_HELPER_CONTRACT_SIGNATURE,
		tokenAddressToHex((twinToken as Erc20Token).address),
		null,
		to
	];

	await loadPendingTransactions({
		toAddress,
		twinToken,
		logsTopics,
		mapPendingTransaction: mapCkErc20PendingTransaction,
		...rest
	});
};

const loadPendingTransactions = async ({
	toAddress,
	lastObservedBlockNumber,
	identity,
	twinToken,
	logsTopics,
	token,
	mapPendingTransaction
}: {
	toAddress: EthAddress;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
	logsTopics: (to: EthAddress) => (string | null)[];
	token: IcToken;
	mapPendingTransaction: (params: MapCkEthereumPendingTransactionParams) => IcTransactionUi;
} & IcCkLinkedAssets) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	emit({
		message: 'oisyCkEthereumPendingTransactions',
		detail: 'in_progress'
	});

	const {
		network: { id: twinTokenNetworkId }
	} = twinToken;

	try {
		const { getLogs } = infuraCkETHProviders(twinTokenNetworkId);
		const pendingLogs = await getLogs({
			contract: { address: toAddress },
			startBlock: Number(lastObservedBlockNumber),
			topics: logsTopics(encodePrincipalToEthAddress(identity.getPrincipal()))
		});

		const { id: tokenId } = token;

		// There are no pending ETH -> ckETH or Erc20 -> ckErc20, therefore, we reset the store.
		// This can be useful if there were previous pending transactions displayed and the transaction has now been processed.
		if (pendingLogs.length === 0) {
			icPendingTransactionsStore.reset(tokenId);
			return;
		}

		const { getTransaction } = alchemyProviders(twinTokenNetworkId);
		const loadTransaction = ({
			transactionHash
		}: Log): Promise<TransactionResponseWithBigInt | null> => getTransaction(transactionHash);

		const pendingTransactions = await Promise.all(pendingLogs.map(loadTransaction));

		icPendingTransactionsStore.set({
			tokenId,
			data: pendingTransactions.filter(nonNullish).map((transaction) => ({
				data: mapPendingTransaction({ transaction, twinToken, token }),
				certified: false
			}))
		});
	} catch (err: unknown) {
		const {
			id: tokenId,
			network: { name: networkName, id: networkId }
		} = twinToken;

		const {
			transactions: {
				error: { loading_pending_ck_ethereum_transactions }
			}
		} = get(i18n);

		trackEvent({
			name: TRACK_COUNT_ETH_PENDING_TRANSACTIONS_ERROR,
			metadata: {
				tokenId: `${tokenId.description}`,
				networkId: `${networkId.description}`
			},
			warning: `${replacePlaceholders(loading_pending_ck_ethereum_transactions, {
				$network: networkName
			})} ${err}`
		});
	} finally {
		emit({
			message: 'oisyCkEthereumPendingTransactions',
			detail: 'idle'
		});
	}
};

export const loadPendingCkEthereumTransaction = async ({
	hash,
	token,
	twinToken,
	networkId
}: {
	hash: string;
	token: IcToken;
	networkId: NetworkId;
} & IcCkLinkedAssets) => {
	try {
		const { getTransaction } = alchemyProviders(networkId);
		const transaction = await getTransaction(hash);

		if (isNullish(transaction)) {
			const {
				transactions: {
					error: { get_transaction_for_hash }
				}
			} = get(i18n);

			toastsError({
				msg: {
					text: replacePlaceholders(get_transaction_for_hash, {
						$hash: hash
					})
				}
			});
			return;
		}

		const { id: tokenId } = token;

		const mapPendingTransaction = isSupportedEthTokenId(twinToken.id)
			? mapCkEthPendingTransaction
			: mapCkErc20PendingTransaction;

		icPendingTransactionsStore.prepend({
			tokenId,
			transaction: {
				data: mapPendingTransaction({
					transaction,
					twinToken,
					token
				}),
				certified: false
			}
		});
	} catch (err: unknown) {
		const {
			transactions: {
				error: { unexpected_transaction_for_hash }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: replacePlaceholders(unexpected_transaction_for_hash, {
					$hash: hash
				})
			},
			err
		});
	}
};
