import type { Readable } from 'svelte/store';
import { derived, writable } from 'svelte/store';

export interface Modal<T> {
	type: 'receive' | 'send' | 'wallet-connect-auth' | 'wallet-connect-sign' | 'wallet-connect-send';
	data?: T;
}

export type ModalData<T> = Modal<T> | undefined | null;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openReceive: () => void;
	openSend: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	return {
		openReceive: () => set({ type: 'receive' }),
		openSend: () => set({ type: 'send' }),
		openWalletConnectAuth: () => set({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <D extends T>(data: D) => set({ type: 'wallet-connect-sign', data }),
		openWalletConnectSend: <D extends T>(data: D) => set({ type: 'wallet-connect-send', data }),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();

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
