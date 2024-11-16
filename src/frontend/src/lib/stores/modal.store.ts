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
		| 'convert-btc-ckbtc'
		| 'convert-to-twin-token-cketh'
		| 'convert-to-twin-token-eth'
		| 'how-to-convert-to-twin-token-eth'
		| 'wallet-connect-auth'
		| 'wallet-connect-sign'
		| 'wallet-connect-send'
		| 'eth-transaction'
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
	modalId?: symbol;
}

export type ModalData<T> = Option<Modal<T>>;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openEthReceive: (modalId: symbol) => void;
	openIcpReceive: (modalId: symbol) => void;
	openIcrcReceive: (modalId: symbol) => void;
	openCkBTCReceive: (modalId: symbol) => void;
	openCkETHReceive: (modalId: symbol) => void;
	openBtcReceive: (modalId: symbol) => void;
	openReceive: (modalId: symbol) => void;
	openSend: (modalId: symbol) => void;
	openBuy: (modalId: symbol) => void;
	openConvertCkBTCToBTC: () => void;
	openConvertBTCToCkBTC: () => void;
	openConvertToTwinTokenCkEth: () => void;
	openConvertToTwinTokenEth: () => void;
	openHowToConvertToTwinTokenEth: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(data: D) => void;
	openWalletConnectSend: <D extends T>(data: D) => void;
	openEthTransaction: <D extends T>(data: D) => void;
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
		openEthReceive: (modalId: symbol) => set({ type: 'eth-receive', modalId }),
		openIcpReceive: (modalId: symbol) => set({ type: 'icp-receive', modalId }),
		openIcrcReceive: (modalId: symbol) => set({ type: 'icrc-receive', modalId }),
		openCkBTCReceive: (modalId: symbol) => set({ type: 'ckbtc-receive', modalId }),
		openCkETHReceive: (modalId: symbol) => set({ type: 'cketh-receive', modalId }),
		openBtcReceive: (modalId: symbol) => set({ type: 'btc-receive', modalId }),
		openReceive: (modalId: symbol) => set({ type: 'receive', modalId }),
		openSend: (modalId: symbol) => set({ type: 'send', modalId }),
		openBuy: (modalId: symbol) => set({ type: 'buy', modalId }),
		openConvertCkBTCToBTC: () => set({ type: 'convert-ckbtc-btc' }),
		openConvertBTCToCkBTC: () => set({ type: 'convert-btc-ckbtc' }),
		openConvertToTwinTokenCkEth: () => set({ type: 'convert-to-twin-token-cketh' }),
		openConvertToTwinTokenEth: () => set({ type: 'convert-to-twin-token-eth' }),
		openHowToConvertToTwinTokenEth: () => set({ type: 'how-to-convert-to-twin-token-eth' }),
		openWalletConnectAuth: () => set({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <D extends T>(data: D) => set({ type: 'wallet-connect-sign', data }),
		openWalletConnectSend: <D extends T>(data: D) => set({ type: 'wallet-connect-send', data }),
		openEthTransaction: <D extends T>(data: D) => set({ type: 'eth-transaction', data }),
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
