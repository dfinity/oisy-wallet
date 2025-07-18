import type BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
import type EthListener from '$eth/components/core/EthListener.svelte';
import type IcTransactionsCkBTCListeners from '$icp/components/transactions/IcTransactionsCkBTCListeners.svelte';
import type IcTransactionsCkEthereumListeners from '$icp/components/transactions/IcTransactionsCkEthereumListeners.svelte';
import type { Token } from '$lib/types/token';

export interface WalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
	destroy: () => void;
}

export type InitWalletWorkerFn = (params: { token: Token }) => Promise<WalletWorker>;

export interface TokenToListener {
	token: Token;
	listener:
		| typeof BitcoinListener
		| typeof EthListener
		| typeof IcTransactionsCkBTCListeners
		| typeof IcTransactionsCkEthereumListeners;
}

export interface WebSocketListener {
	disconnect: () => Promise<void>;
}
