import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface Modal<T> {
	type:
		| 'receive'
		| 'icp-receive'
		| 'icrc-receive'
		| 'ckbtc-receive'
		| 'cketh-receive'
		| 'send'
		| 'convert-ckbtc-btc'
		| 'convert-to-twin-token-cketh'
		| 'convert-to-twin-token-eth'
		| 'how-to-convert-to-twin-token-eth'
		| 'ic-send'
		| 'wallet-connect-auth'
		| 'wallet-connect-sign'
		| 'wallet-connect-send'
		| 'transaction'
		| 'ic-transaction'
		| 'add-token'
		| 'ic-manage-tokens'
		| 'hide-token'
		| 'ic-hide-token'
		| 'token'
		| 'ic-token'
		| 'receive-bitcoin';
	data?: T;
}

export type ModalData<T> = Modal<T> | undefined | null;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openReceive: () => void;
	openIcpReceive: () => void;
	openIcrcReceive: () => void;
	openCkBTCReceive: () => void;
	openCkETHReceive: () => void;
	openSend: () => void;
	openConvertCkBTCToBTC: () => void;
	openConvertToTwinTokenCkEth: () => void;
	openConvertToTwinTokenEth: () => void;
	openHowToConvertToTwinTokenEth: () => void;
	openIcSend: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	openTransaction: <D extends T>(data: D) => void;
	openIcTransaction: <D extends T>(data: D) => void;
	openAddToken: () => void;
	openIcManageTokens: () => void;
	openHideToken: () => void;
	openIcHideToken: () => void;
	openToken: () => void;
	openIcToken: () => void;
	openReceiveBitcoin: () => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	return {
		openReceive: () => set({ type: 'receive' }),
		openIcpReceive: () => set({ type: 'icp-receive' }),
		openIcrcReceive: () => set({ type: 'icrc-receive' }),
		openCkBTCReceive: () => set({ type: 'ckbtc-receive' }),
		openCkETHReceive: () => set({ type: 'cketh-receive' }),
		openSend: () => set({ type: 'send' }),
		openConvertCkBTCToBTC: () => set({ type: 'convert-ckbtc-btc' }),
		openConvertToTwinTokenCkEth: () => set({ type: 'convert-to-twin-token-cketh' }),
		openConvertToTwinTokenEth: () => set({ type: 'convert-to-twin-token-eth' }),
		openHowToConvertToTwinTokenEth: () => set({ type: 'how-to-convert-to-twin-token-eth' }),
		openIcSend: () => set({ type: 'ic-send' }),
		openWalletConnectAuth: () => set({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <D extends T>(data: D) => set({ type: 'wallet-connect-sign', data }),
		openWalletConnectSend: <D extends T>(data: D) => set({ type: 'wallet-connect-send', data }),
		openTransaction: <D extends T>(data: D) => set({ type: 'transaction', data }),
		openIcTransaction: <D extends T>(data: D) => set({ type: 'ic-transaction', data }),
		openAddToken: () => set({ type: 'add-token' }),
		openIcManageTokens: () => set({ type: 'ic-manage-tokens' }),
		openHideToken: () => set({ type: 'hide-token' }),
		openIcHideToken: () => set({ type: 'ic-hide-token' }),
		openToken: () => set({ type: 'token' }),
		openIcToken: () => set({ type: 'ic-token' }),
		openReceiveBitcoin: () => set({ type: 'receive-bitcoin' }),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
