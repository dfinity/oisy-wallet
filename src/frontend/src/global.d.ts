import type { MetamaskProvider } from '$eth/types/metamask';

declare global {
	declare interface Window {
		ethereum: MetamaskProvider;
		transferXtc: ({to, amount}: {to: string; amount: bigint}) => void;
	}
}
