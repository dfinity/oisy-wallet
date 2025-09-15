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
		'onoisyTriggerWallet'?: (event: CustomEvent<any>) => void;
		'onoisyReceive'?: (event: CustomEvent<any>) => void;
		'onoisyReceiveCkBTC'?: (event: CustomEvent<any>) => void;
		'onoisyCkBtcUpdateBalance'?: (event: CustomEvent<any>) => void;
		'onoisyCkBtcMinterInfoStatus'?: (event: CustomEvent<any>) => void;
		'onoisyCkEthMinterInfoStatus'?: (event: CustomEvent<any>) => void;
		'onoisyCkEthereumPendingTransactions'?: (event: CustomEvent<any>) => void;
		'onoisyIndexCanisterBalanceOutOfSync'?: (event: CustomEvent<any>) => void;
		'onoisyValidateAddresses'?: (event: CustomEvent<any>) => void;
		'onoisyRefreshUserProfile'?: (event: CustomEvent<any>) => void;
		'onoisyToggleZeroBalances'?: (event: CustomEvent<any>) => void;
		'onoisyRefreshContacts'?: (event: CustomEvent<any>) => void;
		'onoisyToggleShowHidden'?: (event: CustomEvent<any>) => void;
		'onoisyToggleShowSpam'?: (event: CustomEvent<any>) => void;
	}
}

/* eslint-enable */
