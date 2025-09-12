import type IcTransactionsCkBtcListeners from '$icp/components/transactions/IcTransactionsCkBtcListeners.svelte';
import type IcTransactionsCkEthereumListeners from '$icp/components/transactions/IcTransactionsCkEthereumListeners.svelte';
import type { Token } from '$lib/types/token';

export interface WalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
	destroy: () => void;
}

export type InitWalletWorkerFn<T extends Token = Token> = (params: {
	token: T;
}) => Promise<WalletWorker>;

export interface TokenToListener {
	token: Token;
	listener: typeof IcTransactionsCkBtcListeners | typeof IcTransactionsCkEthereumListeners;
}

export interface WebSocketListener {
	disconnect: () => Promise<void>;
}
