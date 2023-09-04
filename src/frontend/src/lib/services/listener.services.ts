import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import { initPendingTransactionsListener as initErc20PendingTransactionsListenerProvider } from '$lib/providers/alchemy-erc20.providers';
import {
	getTransaction,
	initPendingTransactionsListener as initEthPendingTransactionsListenerProvider,
	initMinedTransactionsListener as initMinedTransactionsListenerProvider
} from '$lib/providers/alchemy.providers';
import { initWalletConnect } from '$lib/providers/wallet-connect.providers';
import { loadBalance } from '$lib/services/balance.services';
import { toastsError } from '$lib/stores/toasts.store';
import { transactionsStore } from '$lib/stores/transactions.store';
import type { ECDSA_PUBLIC_KEY } from '$lib/types/address';
import type { Erc20Token } from '$lib/types/erc20';
import type { WebSocketListener } from '$lib/types/listener';
import type { Token } from '$lib/types/token';
import type { WalletConnectListener } from '$lib/types/wallet-connect';
import { isNullish } from '@dfinity/utils';

const processTransaction = async (hash: string) => {
	const transaction = await getTransaction(hash);

	if (isNullish(transaction)) {
		return;
	}

	transactionsStore.add({
		tokenId: ETHEREUM_TOKEN_ID,
		transactions: [
			{
				...transaction,
				pendingTimestamp: Date.now()
			}
		]
	});

	const { wait, hash: transactionHash } = transaction;

	await wait();

	const minedTransaction = await getTransaction(transactionHash);

	if (isNullish(minedTransaction)) {
		toastsError({
			msg: { text: `Failed to load the mined transaction. Please reload the wallet dapp.` }
		});
		return;
	}

	// At least on Sepolia network we noticed that the timestamp was not provided when getting the transaction in this hook.
	// Therefore, as the transaction has just been mined and for simplicity reason, we display now timestamp if undefined.
	const { timestamp, ...rest } = minedTransaction;

	transactionsStore.update({
		tokenId: ETHEREUM_TOKEN_ID,
		transaction: {
			...rest,
			timestamp: timestamp ?? Date.now() / 1000
		}
	});

	// Reload balance as a transaction has been mined
	await loadBalance();
};

export const initPendingTransactionsListener = ({
	token,
	address
}: {
	token: Token;
	address: ECDSA_PUBLIC_KEY;
}): WebSocketListener => {
	const listener = async (hash: string) => await processTransaction(hash);

	if (token.id === ETHEREUM_TOKEN_ID) {
		return initEthPendingTransactionsListenerProvider({
			address,
			listener
		});
	}

	return initErc20PendingTransactionsListenerProvider({
		address,
		listener,
		contract: token as Erc20Token
	});
};

export const initMinedTransactionsListener = (
	callback: (tx: { removed: boolean; transaction: { has: string } }) => Promise<void>
): WebSocketListener =>
	initMinedTransactionsListenerProvider({
		listener: callback
	});

export const initWalletConnectListener = async (params: {
	uri: string;
	address: ECDSA_PUBLIC_KEY;
}): Promise<WalletConnectListener> => initWalletConnect(params);
