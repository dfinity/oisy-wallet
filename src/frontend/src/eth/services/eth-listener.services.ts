import { ETHEREUM_TOKEN_IDS } from '$env/tokens.env';
import { alchemyErc20Providers } from '$eth/providers/alchemy-erc20.providers';
import {
	initPendingTransactionsListener as initEthPendingTransactionsListenerProvider,
	initMinedTransactionsListener as initMinedTransactionsListenerProvider
} from '$eth/providers/alchemy.providers';
import { initWalletConnect } from '$eth/providers/wallet-connect.providers';
import type { Erc20Token } from '$eth/types/erc20';
import type { WebSocketListener } from '$eth/types/listener';
import type { WalletConnectListener } from '$eth/types/wallet-connect';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { BigNumber } from '@ethersproject/bignumber';
import { processErc20Transaction, processEthTransaction } from './transaction.services';

export const initTransactionsListener = ({
	token,
	address
}: {
	token: Token;
	address: ETH_ADDRESS;
}): WebSocketListener => {
	if (ETHEREUM_TOKEN_IDS.includes(token.id)) {
		return initEthPendingTransactionsListenerProvider({
			toAddress: address,
			listener: async (hash: string) => await processEthTransaction({ hash, token }),
			networkId: token.network.id
		});
	}

	const { initMinedTransactionsListener: initErc20PendingTransactionsListenerProvider } =
		alchemyErc20Providers(token.network.id);

	return initErc20PendingTransactionsListenerProvider({
		address,
		listener: async (params: { hash: string; value: BigNumber }) =>
			await processErc20Transaction({ token, ...params, type: 'mined' }),
		contract: token as Erc20Token
	});
};

export const initMinedTransactionsListener = ({
	callback,
	networkId
}: {
	callback: (tx: { removed: boolean; transaction: { has: string } }) => Promise<void>;
	networkId: NetworkId;
}): WebSocketListener =>
	initMinedTransactionsListenerProvider({
		listener: callback,
		networkId
	});

export const initWalletConnectListener = async (params: {
	uri: string;
	address: ETH_ADDRESS;
}): Promise<WalletConnectListener> => initWalletConnect(params);
