import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { TransactionResponse } from '@ethersproject/abstract-provider';
import type { BigNumber } from '@ethersproject/bignumber';
import { get } from 'svelte/store';

export const processTransactionSent = async ({
	token,
	transaction
}: {
	token: Token;
	transaction: TransactionResponse;
}) => {
	if (isSupportedEthTokenId(token.id)) {
		await processEthTransaction({ hash: transaction.hash, token });
		return;
	}

	// We adapt the value for display purpose because the transaction we get has an ETH value of 0x00
	const value = decodeErc20AbiDataValue(transaction.data);

	await processErc20Transaction({ hash: transaction.hash, value, token, type: 'pending' });
};

export const processEthTransaction = async (params: { hash: string; token: Token }) =>
	await processPendingTransaction(params);

export const processErc20Transaction = async ({
	type,
	...rest
}: {
	hash: string;
	value: BigNumber;
	token: Token;
	type: 'pending' | 'mined';
}) => {
	if (type === 'mined') {
		await processMinedTransaction({ ...rest });
		return;
	}

	await processPendingTransaction({ ...rest });
};

const processPendingTransaction = async ({
	hash,
	token,
	value
}: {
	hash: string;
	token: Token;
	value?: BigNumber;
}) => {
	const { getTransaction } = alchemyProviders(token.network.id);
	const transaction = await getTransaction(hash);

	if (isNullish(transaction)) {
		const {
			transaction: {
				error: { failed_get_transaction }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: replacePlaceholders(failed_get_transaction, {
					$hash: hash
				})
			}
		});
		return;
	}

	ethTransactionsStore.add({
		tokenId: token.id,
		transactions: [
			{
				...transaction,
				pendingTimestamp: Date.now(),
				...(nonNullish(value) && { value })
			}
		]
	});

	const { wait, hash: transactionHash } = transaction;

	await wait();

	await processMinedTransaction({ hash: transactionHash, token, value });
};

const processMinedTransaction = async ({
	hash,
	token,
	value
}: {
	hash: string;
	token: Token;
	value?: BigNumber;
}) => {
	const { getTransaction } = alchemyProviders(token.network.id);
	const minedTransaction = await getTransaction(hash);

	if (isNullish(minedTransaction)) {
		const {
			transaction: {
				error: { failed_get_mined_transaction }
			}
		} = get(i18n);

		toastsError({
			msg: {
				text: replacePlaceholders(failed_get_mined_transaction, {
					$hash: hash
				})
			}
		});
		return;
	}

	// We noticed that the timestamp was not provided when retrieving the transaction at this stage, i.e., after transaction.wait().
	// Therefore, because the transaction has just been mined and as the UI displays a transaction date in the list of transactions, we display now timestamp if undefined.
	// This is for simplicity reasons and because it allows us to avoid making an additional call to getTransaction.
	const { timestamp, ...rest } = minedTransaction;

	ethTransactionsStore.update({
		tokenId: token.id,
		transaction: {
			...rest,
			timestamp,
			displayTimestamp: timestamp ?? Date.now() / 1000,
			...(nonNullish(value) && { value })
		}
	});

	// Reload balance as a transaction has been mined
	await reloadEthereumBalance(token);
};
