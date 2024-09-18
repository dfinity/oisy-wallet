import type { Token } from '$lib/types/token';

export interface WalletWorker {
	start: () => void;
	stop: () => void;
	trigger: () => void;
}

export type InitWalletWorkerFn = (params: { token: Token }) => Promise<WalletWorker>;
