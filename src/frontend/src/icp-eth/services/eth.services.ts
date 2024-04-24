import {
	CKERC20_HELPER_CONTRACT_SIGNATURES,
	CKETH_HELPER_CONTRACT_SIGNATURES
} from '$env/networks.cketh.env';
import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { infuraCkETHProviders } from '$eth/providers/infura-cketh.providers';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { mapCkEthereumPendingTransaction } from '$icp-eth/utils/cketh-transactions.utils';
import { icPendingTransactionsStore } from '$icp/stores/ic-pending-transactions.store';
import type { IcCkTwinToken, IcToken } from '$icp/types/ic';
import { nullishSignOut } from '$lib/services/auth.services';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import { emit } from '$lib/utils/events.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { Log } from 'alchemy-sdk';
import { get } from 'svelte/store';

export const loadCkEthereumPendingTransactions = async ({
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	token: IcToken;
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

const contractSignature = ({
	env,
	twinToken
}: { env: Record<NetworkId, string> } & IcCkTwinToken): string | undefined => {
	const {
		symbol,
		network: { id: twinTokenNetworkId }
	} = twinToken;

	const signature = env[twinTokenNetworkId];

	if (isNullish(signature)) {
		const {
			transactions: {
				error: { helper_signature_missing }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: replacePlaceholders(helper_signature_missing, {
					$token: symbol
				})
			}
		});

		return undefined;
	}

	return signature;
};

const loadCkETHPendingTransactions = async ({
	toAddress,
	twinToken,
	...rest
}: {
	toAddress: ETH_ADDRESS;
	token: IcToken;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
} & IcCkTwinToken) => {
	const signature = contractSignature({
		env: CKETH_HELPER_CONTRACT_SIGNATURES,
		twinToken
	});

	if (isNullish(signature)) {
		return;
	}

	const logsTopics = (to: ETH_ADDRESS): (string | null)[] => [signature, null, to];

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
	token: IcToken;
} & IcCkTwinToken) => {
	const signature = contractSignature({
		env: CKERC20_HELPER_CONTRACT_SIGNATURES,
		twinToken
	});

	if (isNullish(signature)) {
		return;
	}

	const logsTopics = (to: ETH_ADDRESS): (string | null)[] => [signature, null, null, to];

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
	logsTopics,
	token
}: {
	toAddress: ETH_ADDRESS;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
	logsTopics: (to: ETH_ADDRESS) => (string | null)[];
	token: IcToken;
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

		// There are no pending ETH -> ckETH or Erc20 -> ckErc20, therefore we reset the store.
		// This can be useful if there was a previous pending transactions displayed and the transaction has now been processed.
		if (pendingLogs.length === 0) {
			icPendingTransactionsStore.reset(tokenId);
			return;
		}

		const { getTransaction } = alchemyProviders(twinTokenNetworkId);
		const loadTransaction = ({ transactionHash }: Log): Promise<TransactionResponse | null> =>
			getTransaction(transactionHash);

		const pendingTransactions = await Promise.all(pendingLogs.map(loadTransaction));

		icPendingTransactionsStore.set({
			tokenId,
			data: pendingTransactions.filter(nonNullish).map((transaction) => ({
				data: mapCkEthereumPendingTransaction({ transaction, twinToken, token }),
				certified: false
			}))
		});
	} catch (err: unknown) {
		const {
			network: { name: networkName }
		} = twinToken;

		const {
			transactions: {
				error: { loading_pending_ck_ethereum_transactions }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: replacePlaceholders(loading_pending_ck_ethereum_transactions, {
					$network: networkName
				})
			},
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
	token,
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

		icPendingTransactionsStore.prepend({
			tokenId,
			transaction: {
				data: mapCkEthereumPendingTransaction({
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
