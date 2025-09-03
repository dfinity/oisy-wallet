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

/* eslint-disable */

declare namespace svelteHTML {
	interface HTMLAttributes<T> {
		'on:oisyTriggerWallet'?: (event: CustomEvent<any>) => void;
		'on:oisyReceive'?: (event: CustomEvent<any>) => void;
		'on:oisyReceiveCkBTC'?: (event: CustomEvent<any>) => void;
		'on:oisyCkBtcUpdateBalance'?: (event: CustomEvent<any>) => void;
		'on:oisyCkBtcMinterInfoStatus'?: (event: CustomEvent<any>) => void;
		'on:oisyCkEthMinterInfoStatus'?: (event: CustomEvent<any>) => void;
		'on:oisyCkEthereumPendingTransactions'?: (event: CustomEvent<any>) => void;
		'on:oisyValidateAddresses'?: (event: CustomEvent<any>) => void;
		'on:oisyRefreshUserProfile'?: (event: CustomEvent<any>) => void;
		'on:oisyToggleZeroBalances'?: (event: CustomEvent<any>) => void;
		'on:oisyRefreshContacts'?: (event: CustomEvent<any>) => void;
		'on:oisyToggleShowSpam'?: (event: CustomEvent<any>) => void;
	}
}

/* eslint-enable */
