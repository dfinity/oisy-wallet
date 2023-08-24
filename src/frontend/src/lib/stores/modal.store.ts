import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export type Modal = 'receive' | 'send' | 'wallet-connect-auth' | 'wallet-connect-sign';

export type ModalData = Modal | undefined | null;

export interface ModalStore extends Readable<ModalData> {
	openReceive: () => void;
	openSend: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: () => void;
	close: () => void;
}

const initModalStore = (): ModalStore => {
	const { subscribe, set } = writable<ModalData>(undefined);

	return {
		openReceive: () => set('receive'),
		openSend: () => set('send'),
		openWalletConnectAuth: () => set('wallet-connect-auth'),
		openWalletConnectSign: () => set('wallet-connect-sign'),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
