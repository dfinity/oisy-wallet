import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface Modal<T> {
	type:
		| 'receive'
		| 'icp-receive'
		| 'ckbtc-receive'
		| 'cketh-receive'
		| 'send'
		| 'convert-eth-cketh'
		| 'convert-cketh-eth'
		| 'how-to-convert-eth-cketh'
		| 'ic-send'
		| 'wallet-connect-auth'
		| 'wallet-connect-sign'
		| 'wallet-connect-send'
		| 'airdrop'
		| 'transaction'
		| 'ic-transaction'
		| 'add-token'
		| 'receive-bitcoin';
	data?: T;
}

export type ModalData<T> = Modal<T> | undefined | null;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openReceive: () => void;
	openIcpReceive: () => void;
	openCkBTCReceive: () => void;
	openCkETHReceive: () => void;
	openSend: () => void;
	openConvertETHToCkETH: () => void;
	openConvertCkETHToETH: () => void;
	openHowToConvertETHToCkETH: () => void;
	openIcSend: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	openAirdrop: () => void;
	openTransaction: <D extends T>(data: D) => void;
	openIcTransaction: <D extends T>(data: D) => void;
	openAddToken: () => void;
	openReceiveBitcoin: () => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	return {
		openReceive: () => set({ type: 'receive' }),
		openIcpReceive: () => set({ type: 'icp-receive' }),
		openCkBTCReceive: () => set({ type: 'ckbtc-receive' }),
		openCkETHReceive: () => set({ type: 'cketh-receive' }),
		openSend: () => set({ type: 'send' }),
		openConvertETHToCkETH: () => set({ type: 'convert-eth-cketh' }),
		openConvertCkETHToETH: () => set({ type: 'convert-cketh-eth' }),
		openHowToConvertETHToCkETH: () => set({ type: 'how-to-convert-eth-cketh' }),
		openIcSend: () => set({ type: 'ic-send' }),
		openWalletConnectAuth: () => set({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <D extends T>(data: D) => set({ type: 'wallet-connect-sign', data }),
		openWalletConnectSend: <D extends T>(data: D) => set({ type: 'wallet-connect-send', data }),
		openAirdrop: () => set({ type: 'airdrop' }),
		openTransaction: <D extends T>(data: D) => set({ type: 'transaction', data }),
		openIcTransaction: <D extends T>(data: D) => set({ type: 'ic-transaction', data }),
		openAddToken: () => set({ type: 'add-token' }),
		openReceiveBitcoin: () => set({ type: 'receive-bitcoin' }),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
