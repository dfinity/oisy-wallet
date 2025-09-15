// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}
}

declare const VITE_APP_VERSION: string;
declare const VITE_DFX_NETWORK: string;

declare const VITE_GIT_COMMIT_HASH: string;
declare const VITE_GIT_BRANCH_NAME: string;
