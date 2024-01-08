import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { WebSocketListener } from '$eth/types/listener';
import type { Token } from '$lib/types/token';
import type { WalletConnectListener } from '$eth/types/wallet-connect';
import type { BigNumber } from '@ethersproject/bignumber';
import { initMinedTransactionsListener as initErc20PendingTransactionsListenerProvider } from '../providers/alchemy-erc20.providers';
import {
	initPendingTransactionsListener as initEthPendingTransactionsListenerProvider,
	initMinedTransactionsListener as initMinedTransactionsListenerProvider
} from '../providers/alchemy.providers';
import { initWalletConnect } from '../providers/wallet-connect.providers';
import { processErc20Transaction, processEthTransaction } from './transaction.services';

export const initTransactionsListener = ({
	token,
	address
}: {
	token: Token;
	address: ETH_ADDRESS;
}): WebSocketListener => {
	if (token.id === ETHEREUM_TOKEN_ID) {
		return initEthPendingTransactionsListenerProvider({
			address,
			listener: async (hash: string) => await processEthTransaction({ hash })
		});
	}

	return initErc20PendingTransactionsListenerProvider({
		address,
		listener: async (params: { hash: string; value: BigNumber }) =>
			await processErc20Transaction({ token, ...params, type: 'mined' }),
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
	address: ETH_ADDRESS;
}): Promise<WalletConnectListener> => initWalletConnect(params);
