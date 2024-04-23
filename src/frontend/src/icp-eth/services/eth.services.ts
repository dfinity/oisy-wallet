import {
	RECEIVED_ERC20_EVENT_SIGNATURE,
	RECEIVED_ETH_EVENT_SIGNATURE
} from '$eth/constants/cketh.constants';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { mapCkEthereumPendingTransaction } from '$icp-eth/utils/cketh-transactions.utils';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcCkTwinToken, IcToken } from '$icp/types/ic';
import { nullishSignOut } from '$lib/services/auth.services';
import { toastsError } from '$lib/stores/toasts.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { TokenId } from '$lib/types/token';
import { emit } from '$lib/utils/events.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { Log } from 'alchemy-sdk';

export const loadCkEthereumPendingTransactions = async ({
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
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
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
	const logsTopics = (to: ETH_ADDRESS): (string | null)[] => [
		RECEIVED_ETH_EVENT_SIGNATURE,
		null,
		to
	];

	await loadPendingTransactions({
		toAddress,
		twinToken,
		logsTopics,
		...rest
	});
};

const loadCkErc20PendingTransactions = async ({
	toAddress,
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
	const logsTopics = (to: ETH_ADDRESS): (string | null)[] => [
		RECEIVED_ERC20_EVENT_SIGNATURE,
		null,
		null,
		to
	];

	await loadPendingTransactions({
		toAddress,
		twinToken,
		logsTopics,
		...rest
	});
};

const loadPendingTransactions = async ({
	toAddress,
	lastObservedBlockNumber,
	identity,
	twinToken,
	logsTopics
}: {
	toAddress: ETH_ADDRESS;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
	logsTopics: (to: ETH_ADDRESS) => (string | null)[];
} & IcCkTwinToken) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	emit({
		message: 'oisyCkEthereumPendingTransactions',
		detail: 'in_progress'
	});

	const {
		id: tokenId,
		network: { id: networkId }
	} = twinToken;

	try {
		const { getLogs } = infuraCkETHProviders(networkId);
		const pendingLogs = await getLogs({
			contract: { address: toAddress },
			startBlock: Number(lastObservedBlockNumber),
			topics: logsTopics(encodePrincipalToEthAddress(identity.getPrincipal()))
		});

		// There are no pending ETH -> ckETH or Erc20 -> ckErc20, therefore we reset the store.
		// This can be useful if there was a previous pending transactions displayed and the transaction has now been processed.
		if (pendingLogs.length === 0) {
			icPendingTransactionsStore.reset(tokenId);
			return;
		}

		const loadTransaction = ({ transactionHash }: Log): Promise<TransactionResponse | null> => {
			const { getTransaction } = alchemyProviders(networkId);
			return getTransaction(transactionHash);
		};

		const pendingTransactions = await Promise.all(pendingLogs.map(loadTransaction));

		icPendingTransactionsStore.set({
			tokenId,
			data: pendingTransactions.filter(nonNullish).map((transaction) => ({
				data: mapCkEthereumPendingTransaction({ transaction, twinToken }),
				certified: false
			}))
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: 'Something went wrong while fetching the pending Ethereum transactions.' },
			err
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
	token: { id: tokenId },
	twinToken,
	networkId
}: {
	hash: string;
	token: IcToken;
	networkId: NetworkId;
} & IcCkTwinToken) => {
	try {
		const { getTransaction } = alchemyProviders(networkId);
		const transaction = await getTransaction(hash);

		if (isNullish(transaction)) {
			toastsError({
				msg: {
					text: `Failed to get the transaction from the provided (hash: ${hash}). Please reload the wallet dapp.`
				}
			});
			return;
		}

		icPendingTransactionsStore.prepend({
			tokenId,
			transaction: {
				data: mapCkEthereumPendingTransaction({
					transaction,
					twinToken
				}),
				certified: false
			}
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: 'Something went wrong while loading the pending ETH <> ckETH transaction.' },
			err
		});
	}
};
