import type {
	NoParamEvent,
	OisyIndexCanisterBalanceOutOfSyncEvent,
	OisyReloadCollectionsEvent,
	OisySyncStatusEvent
} from '$lib/types/custom-events';

declare module 'svelte/elements' {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	export interface HTMLAttributes<T> {
		onoisyTriggerWallet?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyReceiveCkBTC?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyCkBtcUpdateBalance?: (event: CustomEvent<OisySyncStatusEvent>) => void;
		onoisyCkBtcMinterInfoStatus?: (event: CustomEvent<OisySyncStatusEvent>) => void;
		onoisyCkEthMinterInfoStatus?: (event: CustomEvent<OisySyncStatusEvent>) => void;
		onoisyCkEthereumPendingTransactions?: (event: CustomEvent<OisySyncStatusEvent>) => void;
		onoisyIndexCanisterBalanceOutOfSync?: (
			event: CustomEvent<OisyIndexCanisterBalanceOutOfSyncEvent>
		) => void;
		onoisyValidateAddresses?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyRefreshUserProfile?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyToggleZeroBalances?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyRefreshContacts?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyDisconnectWalletConnect?: (event: CustomEvent<NoParamEvent>) => void;
		onoisyReloadCollections?: (event: CustomEvent<OisyReloadCollectionsEvent>) => void;
	}
}

export {};
