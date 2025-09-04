import { alchemyProviders } from '$eth/providers/alchemy.providers';
import { reloadEthereumBalance } from '$eth/services/eth-balance.services';
import { reloadEthereumTransactions } from '$eth/services/eth-transactions.services';
import { ethTransactionsStore } from '$eth/stores/eth-transactions.store';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { decodeErc20AbiDataValue } from '$eth/utils/transactions.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import { i18n } from '$lib/stores/i18n.store';
import type { Token } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { TransactionResponse } from 'ethers/providers';
import { get } from 'svelte/store';

export const processTransactionSent = async ({
	token,
	transaction
}: {
	token: Token;
	transaction: TransactionResponse;
}) => {
	if (isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id)) {
		await processEthTransaction({ hash: transaction.hash, token });
		return;
	}

	// We adapt the value for display purpose because the transaction we get has an ETH value of 0x00
	const value = decodeErc20AbiDataValue({ data: transaction.data });

	await processErc20Transaction({ hash: transaction.hash, value, token, type: 'pending' });
};

export const processEthTransaction = async (params: { hash: string; token: Token }) =>
	await processPendingTransaction(params);

export const processErc20Transaction = async ({
	type,
	...rest
}: {
	hash: string;
	value: bigint;
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
	value?: bigint;
}) => {
	const {
		id: tokenId,
		network: { id: networkId }
	} = token;

	const { getTransaction } = alchemyProviders(networkId);
	const transaction = await getTransaction(hash);

	if (isNullish(transaction)) {
		// The provider searches in the transaction pool for pending transactions. But that does not guarantee that it found it.
		// For example, for Base network, it does not work.
		// So, for now, we do not show the toast error, just a console error.
		// TODO: implement a better way to handle this, trying to check if it can be improved to show Base pending transactions too
		console.error(
			replacePlaceholders(get(i18n).transaction.error.failed_get_transaction, {
				$hash: hash
			})
		);
		return;
	}

	const { to, ...rest } = transaction;

	ethTransactionsStore.add({
		tokenId,
		transactions: [
			{
				data: {
					...rest,
					// For ERC20 pending transactions, we noticed that the `to` field is not correct, since it shows the token address instead of the recipient address.
					// To avoid confusion on the user side, we prefer not to display the `to` field for ERC20 pending transactions.
					...(!isTokenErc20(token) && { to }),
					pendingTimestamp: Date.now(),
					...(nonNullish(value) && { value })
				},
				// We set the certified property to false because we don't have a way to certify ERC20 transactions for now.
				certified: false
			}
		]
	});

	const { wait } = transaction;

	await wait();

	await processMinedTransaction({ token });
};

// At some point in the past, we were fetching the transactions from the provider. But, with ERC20 transactions,
// we noticed that, even if the transaction is mined, the source or the destination address is not
// the real address, but the token address. That gave wrong data in the UI.
// So, we decided to call the service that reloads all transactions.
const processMinedTransaction = async ({ token }: { token: Token }) => {
	const {
		id: tokenId,
		network: { id: networkId },
		standard
	} = token;

	// Reload transactions as a transaction has been mined
	await reloadEthereumTransactions({ tokenId, networkId, standard });

	// Reload balance as a transaction has been mined
	await reloadEthereumBalance(token);
};
