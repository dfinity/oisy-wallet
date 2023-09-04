import type { MetamaskProvider } from '$lib/types/metamask';

declare global {
	declare interface Window {
		ethereum: MetamaskProvider;
	}
}
