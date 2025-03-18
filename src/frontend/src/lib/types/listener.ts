import type { Token } from '$lib/types/token';
import type { ComponentType as Component } from 'svelte';

export interface WalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type InitWalletWorkerFn = (params: { token: Token }) => Promise<WalletWorker>;

export interface TokenToListener {
	token: Token;
	listener: Component;
}

export interface WebSocketListener {
	disconnect: () => Promise<void>;
}
