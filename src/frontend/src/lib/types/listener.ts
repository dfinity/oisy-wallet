import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
import EthListener from '$eth/components/core/EthListener.svelte';
import type { Token } from '$lib/types/token';

export interface WalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type InitWalletWorkerFn = (params: { token: Token }) => Promise<WalletWorker>;

export interface TokenToListener {
	token: Token;
	listener: typeof BitcoinListener | typeof EthListener;
}

export interface WebSocketListener {
	disconnect: () => Promise<void>;
}
