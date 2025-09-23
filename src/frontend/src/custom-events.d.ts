// TODO: try to provide the correct types to the events
declare module 'svelte/elements' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export interface HTMLAttributes<T> {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyTriggerWallet?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyReceiveCkBTC?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyCkBtcUpdateBalance?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyCkBtcMinterInfoStatus?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyCkEthMinterInfoStatus?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyCkEthereumPendingTransactions?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyIndexCanisterBalanceOutOfSync?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyValidateAddresses?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyRefreshUserProfile?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyToggleZeroBalances?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyRefreshContacts?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyToggleShowHidden?: (event: CustomEvent<any>) => void;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onoisyToggleShowSpam?: (event: CustomEvent<any>) => void;
	}
}

export {};
