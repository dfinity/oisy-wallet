import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface Modal<T> {
	type:
		| 'receive'
		| 'send'
		| 'wallet-connect-auth'
		| 'wallet-connect-sign'
		| 'wallet-connect-send'
		| 'airdrop'
		| 'burn';
	data?: T;
}

export type ModalData<T> = Modal<T> | undefined | null;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openReceive: () => void;
	openSend: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	openAirdrop: () => void;
	openBurn: () => void;
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
		openAirdrop: () => set({ type: 'airdrop' }),
		openBurn: () => set({ type: 'burn' }),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
