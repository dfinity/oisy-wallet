import { alchemyErc20Providers } from '$eth/providers/alchemy-erc20.providers';
import { initMinedTransactionsListener as initMinedTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
import { initWalletConnect } from '$eth/providers/wallet-connect.providers';
import {
	processErc20Transaction,
	processEthTransaction
} from '$eth/services/eth-transaction.services';
import type { Erc20Token } from '$eth/types/erc20';
import type { WebSocketListener } from '$eth/types/listener';
import type { WalletConnectListener } from '$eth/types/wallet-connect';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import type { EthAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import type { BigNumber } from '@ethersproject/bignumber';

export const initTransactionsListener = ({
	token,
	address
}: {
	token: Token;
	address: EthAddress;
}): WebSocketListener => {
	if (isSupportedEthTokenId(token.id)) {
		return initMinedTransactionsListenerProvider({
			toAddress: address,
			listener: async ({ transaction: { hash } }: { transaction: { hash: string } }) =>
				await processEthTransaction({ hash, token }),
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

export const initWalletConnectListener = (params: {
	uri: string;
	address: EthAddress;
}): Promise<WalletConnectListener> => initWalletConnect(params);
