import type { MetamaskProvider } from '$lib/types/metamask';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	declare interface Window {
		ethereum: MetamaskProvider;
	}
}

declare const VITE_APP_VERSION: string;
