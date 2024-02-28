import { getTransaction } from '$eth/providers/alchemy.providers';
import { transactions as transactionsProviders } from '$eth/providers/etherscan.providers';
import { populateDepositTransaction } from '$eth/providers/infura-cketh.providers';
import { mapCkETHPendingTransaction } from '$icp-eth/utils/cketh-transactions.utils';
import { convertEthToCkEthPendingStore } from '$icp/stores/cketh-transactions.store';
import { nullishSignOut } from '$lib/services/auth.services';
import { toastsError } from '$lib/stores/toasts.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import { emit } from '$lib/utils/events.utils';
import { encodePrincipalToEthAddress } from '@dfinity/cketh';
import { isNullish } from '@dfinity/utils';

export const loadPendingCkEthTransactions = async ({
	toAddress,
	tokenId,
	lastObservedBlockNumber,
	identity
}: {
	toAddress: ETH_ADDRESS;
	tokenId: TokenId;
	lastObservedBlockNumber: bigint;
	identity: OptionIdentity;
}) => {
	if (isNullish(identity)) {
		await nullishSignOut();
		return;
	}

	emit({
		message: 'oisyCkEthPendingTransactions',
		detail: 'in_progress'
	});

	try {
		const transactions = await transactionsProviders({
			address: toAddress,
			startBlock: `${lastObservedBlockNumber}`
		});

		// We compute the data of a transfer of ETH to the ckETH helper contract with the principal of the user.
		// That way, we can use the data to compare the pending transaction of the contract to filter those that targets this user.
		const { data } = await populateDepositTransaction({
			contract: { address: toAddress },
			to: encodePrincipalToEthAddress(identity.getPrincipal())
		});

		const pendingEthToCkEthTransactions = transactions.filter(
			({ data: txData }) => txData === data
		);

		// There are no pending ETH -> ckETH transactions, therefore we reset the store.
		// This can be useful if there was a previous pending transactions displayed and the transaction has now been processed.
		if (pendingEthToCkEthTransactions.length === 0) {
			convertEthToCkEthPendingStore.reset(tokenId);
			return;
		}

		convertEthToCkEthPendingStore.set({
			tokenId,
			data: pendingEthToCkEthTransactions.map((transaction) => ({
				data: mapCkETHPendingTransaction({ transaction }),
				certified: false
			}))
		});
	} catch (err: unknown) {
		toastsError({
			msg: { text: 'Something went wrong while fetching the pending ETH <> ckETH transactions.' },
			err
		});
	} finally {
		emit({
			message: 'oisyCkEthPendingTransactions',
			detail: 'idle'
		});
	}
};

export const loadPendingCkEthTransaction = async ({
	hash,
	tokenId
}: {
	hash: string;
	tokenId: TokenId;
}) => {
	try {
		const transaction = await getTransaction(hash);

		if (isNullish(transaction)) {
			toastsError({
				msg: {
					text: `Failed to get the transaction from the provided (hash: ${hash}). Please reload the wallet dapp.`
				}
			});
			return;
		}

		convertEthToCkEthPendingStore.prepend({
			tokenId,
			transaction: {
				data: mapCkETHPendingTransaction({ transaction }),
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
