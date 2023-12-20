import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface Modal<T> {
	type:
		| 'receive'
		| 'send'
		| 'icp-send'
		| 'wallet-connect-auth'
		| 'wallet-connect-sign'
		| 'wallet-connect-send'
		| 'airdrop'
		| 'transaction'
		| 'icp-transaction'
		| 'add-token';
	data?: T;
}

export type ModalData<T> = Modal<T> | undefined | null;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openReceive: () => void;
	openSend: () => void;
	openIcpSend: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	openAirdrop: () => void;
	openTransaction: <D extends T>(data: D) => void;
	openIcpTransaction: <D extends T>(data: D) => void;
	openAddToken: () => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	return {
		openReceive: () => set({ type: 'receive' }),
		openSend: () => set({ type: 'send' }),
		openIcpSend: () => set({ type: 'icp-send' }),
		openWalletConnectAuth: () => set({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <D extends T>(data: D) => set({ type: 'wallet-connect-sign', data }),
		openWalletConnectSend: <D extends T>(data: D) => set({ type: 'wallet-connect-send', data }),
		openAirdrop: () => set({ type: 'airdrop' }),
		openTransaction: <D extends T>(data: D) => set({ type: 'transaction', data }),
		openIcpTransaction: <D extends T>(data: D) => set({ type: 'icp-transaction', data }),
		openAddToken: () => set({ type: 'add-token' }),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
