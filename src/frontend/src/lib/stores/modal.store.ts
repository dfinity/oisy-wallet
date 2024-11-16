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

export const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	const setType = (type: Modal<T>['type']) => () => set({ type });

	const setTypeWithId = (type: Modal<T>['type']) => (modalId: symbol) => set({ type, modalId });

	const setTypeWithData =
		(type: Modal<T>['type']) =>
		<D extends T>(data: D) =>
			set({ type, data });

	return {
		openEthReceive: setTypeWithId('eth-receive'),
		openIcpReceive: setTypeWithId('icp-receive'),
		openIcrcReceive: setTypeWithId('icrc-receive'),
		openCkBTCReceive: setTypeWithId('ckbtc-receive'),
		openCkETHReceive: setTypeWithId('cketh-receive'),
		openBtcReceive: setTypeWithId('btc-receive'),
		openReceive: setTypeWithId('receive'),
		openSend: setTypeWithId('send'),
		openBuy: setTypeWithId('buy'),
		openConvertCkBTCToBTC: setType('convert-ckbtc-btc'),
		openConvertBTCToCkBTC: setType('convert-btc-ckbtc'),
		openConvertToTwinTokenCkEth: setType('convert-to-twin-token-cketh'),
		openConvertToTwinTokenEth: setType('convert-to-twin-token-eth'),
		openHowToConvertToTwinTokenEth: setType('how-to-convert-to-twin-token-eth'),
		openWalletConnectAuth: setType('wallet-connect-auth'),
		openWalletConnectSign: setTypeWithData('wallet-connect-sign'),
		openWalletConnectSend: setTypeWithData('wallet-connect-send'),
		openEthTransaction: setTypeWithData('eth-transaction'),
		openIcTransaction: setTypeWithData('ic-transaction'),
		openBtcTransaction: setTypeWithData('btc-transaction'),
		openManageTokens: setType('manage-tokens'),
		openHideToken: setType('hide-token'),
		openIcHideToken: setType('ic-hide-token'),
		openToken: setType('token'),
		openIcToken: setType('ic-token'),
		openReceiveBitcoin: setType('receive-bitcoin'),
		openAboutWhyOisy: setType('about-why-oisy'),
		openDappDetails: setTypeWithData('dapp-details'),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
