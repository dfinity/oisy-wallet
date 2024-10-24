import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export interface Modal<T> {
	type:
		| 'eth-receive'
		| 'icp-receive'
		| 'icrc-receive'
		| 'ckbtc-receive'
		| 'cketh-receive'
		| 'btc-receive'
		| 'receive'
		| 'send'
		| 'buy'
		| 'convert-ckbtc-btc'
		| 'convert-to-twin-token-cketh'
		| 'convert-to-twin-token-eth'
		| 'how-to-convert-to-twin-token-eth'
		| 'wallet-connect-auth'
		| 'wallet-connect-sign'
		| 'wallet-connect-send'
		| 'transaction'
		| 'ic-transaction'
		| 'manage-tokens'
		| 'hide-token'
		| 'ic-hide-token'
		| 'token'
		| 'ic-token'
		| 'receive-bitcoin'
		| 'about-why-oisy'
		| 'btc-transaction'
		| 'dapp-details';
	data?: T;
}

export type ModalData<T> = Option<Modal<T>>;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openEthReceive: <D extends T>(data: D) => void;
	openIcpReceive: <D extends T>(data: D) => void;
	openIcrcReceive: <D extends T>(data: D) => void;
	openCkBTCReceive: <D extends T>(data: D) => void;
	openCkETHReceive: <D extends T>(data: D) => void;
	openBtcReceive: <D extends T>(data: D) => void;
	openReceive: <D extends T>(data: D) => void;
	openSend: <D extends T>(data: D) => void;
	openBuy: <D extends T>(data: D) => void;
	openConvertCkBTCToBTC: () => void;
	openConvertToTwinTokenCkEth: () => void;
	openConvertToTwinTokenEth: () => void;
	openHowToConvertToTwinTokenEth: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	openTransaction: <D extends T>(data: D) => void;
	openIcTransaction: <D extends T>(data: D) => void;
	openBtcTransaction: <D extends T>(data: D) => void;
	openManageTokens: () => void;
	openHideToken: () => void;
	openIcHideToken: () => void;
	openToken: () => void;
	openIcToken: () => void;
	openReceiveBitcoin: () => void;
	openAboutWhyOisy: () => void;
	openDappDetails: <D extends T>(data: D) => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	return {
		openEthReceive: <D extends T>(data: D) => set({ type: 'eth-receive', data }),
		openIcpReceive: <D extends T>(data: D) => set({ type: 'icp-receive', data }),
		openIcrcReceive: <D extends T>(data: D) => set({ type: 'icrc-receive', data }),
		openCkBTCReceive: <D extends T>(data: D) => set({ type: 'ckbtc-receive', data }),
		openCkETHReceive: <D extends T>(data: D) => set({ type: 'cketh-receive', data }),
		openBtcReceive: <D extends T>(data: D) => set({ type: 'btc-receive', data }),
		openReceive: <D extends T>(data: D) => set({ type: 'receive', data }),
		openSend: <D extends T>(data: D) => set({ type: 'send', data }),
		openBuy: <D extends T>(data: D) => set({ type: 'buy', data }),
		openConvertCkBTCToBTC: () => set({ type: 'convert-ckbtc-btc' }),
		openConvertToTwinTokenCkEth: () => set({ type: 'convert-to-twin-token-cketh' }),
		openConvertToTwinTokenEth: () => set({ type: 'convert-to-twin-token-eth' }),
		openHowToConvertToTwinTokenEth: () => set({ type: 'how-to-convert-to-twin-token-eth' }),
		openWalletConnectAuth: () => set({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <D extends T>(data: D) => set({ type: 'wallet-connect-sign', data }),
		openWalletConnectSend: <D extends T>(data: D) => set({ type: 'wallet-connect-send', data }),
		openTransaction: <D extends T>(data: D) => set({ type: 'transaction', data }),
		openIcTransaction: <D extends T>(data: D) => set({ type: 'ic-transaction', data }),
		openBtcTransaction: <D extends T>(data: D) => set({ type: 'btc-transaction', data }),
		openManageTokens: () => set({ type: 'manage-tokens' }),
		openHideToken: () => set({ type: 'hide-token' }),
		openIcHideToken: () => set({ type: 'ic-hide-token' }),
		openToken: () => set({ type: 'token' }),
		openIcToken: () => set({ type: 'ic-token' }),
		openReceiveBitcoin: () => set({ type: 'receive-bitcoin' }),
		openAboutWhyOisy: () => set({ type: 'about-why-oisy' }),
		openDappDetails: <D extends T>(data: D) => set({ type: 'dapp-details', data }),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
