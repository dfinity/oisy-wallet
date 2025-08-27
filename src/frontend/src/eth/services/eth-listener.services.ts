import { initMinedTransactionsListener as initMinedTransactionsListenerProvider } from '$eth/providers/alchemy.providers';
import type { WebSocketListener } from '$lib/types/listener';
import type { NetworkId } from '$lib/types/network';

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
