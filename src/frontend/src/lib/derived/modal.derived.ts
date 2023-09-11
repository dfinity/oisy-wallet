import { modalStore } from '$lib/stores/modal.store';
import { derived, type Readable } from 'svelte/store';

export const modalReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'receive'
);
export const modalSend: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'send'
);
export const modalWalletConnectAuth: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'wallet-connect-auth'
);
export const modalWalletConnectSign: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'wallet-connect-sign'
);
export const modalWalletConnectSend: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'wallet-connect-send'
);

export const modalWalletConnect: Readable<boolean> = derived(
	[modalWalletConnectAuth, modalWalletConnectSign, modalWalletConnectSend],
	([$modalWalletConnectAuth, $modalWalletConnectSign, $modalWalletConnectSend]) =>
		$modalWalletConnectAuth || $modalWalletConnectSign || $modalWalletConnectSend
);
