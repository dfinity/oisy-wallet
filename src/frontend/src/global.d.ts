import type { MetamaskProvider } from '$eth/types/metamask';

declare global {
	declare interface Window {
		ethereum: MetamaskProvider;
	}
}

declare global {
	interface BigInt {
		toJSON(): string;
	}
}
