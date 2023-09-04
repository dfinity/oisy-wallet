import type { ExternalProvider } from '@ethersproject/providers';

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
		ethereum: ExternalProvider;
	}
}

declare const VITE_APP_VERSION: string;
