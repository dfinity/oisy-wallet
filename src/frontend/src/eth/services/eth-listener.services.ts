import { alchemyErc20Providers } from '$eth/providers/alchemy-erc20.providers';
import { initMinedTransactionsListener as initMinedTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
import {
	processErc20Transaction,
	processEthTransaction
} from '$eth/services/eth-transaction.services';
import type { Erc20Token } from '$eth/types/erc20';
import { isSupportedEthTokenId } from '$eth/utils/eth.utils';
import { isSupportedEvmNativeTokenId } from '$evm/utils/native-token.utils';
import type { EthAddress } from '$lib/types/address';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';

export const initTransactionsListener = ({
	token,
	address
}: {
	token: Token;
	address: EthAddress;
}): WebSocketListener => {
	if (isSupportedEthTokenId(token.id) || isSupportedEvmNativeTokenId(token.id)) {
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
		listener: async (params: { hash: string; value: bigint }) =>
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
