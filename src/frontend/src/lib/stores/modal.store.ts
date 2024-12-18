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
		| 'sol-receive'
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
		| 'eth-token'
		| 'ic-token'
		| 'receive-bitcoin'
		| 'about-why-oisy'
		| 'btc-transaction'
		| 'dapp-details';
	data?: T;
	id?: symbol;
}

export type ModalData<T> = Option<Modal<T>>;

export interface ModalStore<T> extends Readable<ModalData<T>> {
	openEthReceive: (id: symbol) => void;
	openIcpReceive: (id: symbol) => void;
	openIcrcReceive: (id: symbol) => void;
	openCkBTCReceive: (id: symbol) => void;
	openCkETHReceive: (id: symbol) => void;
	openBtcReceive: (id: symbol) => void;
	openSolReceive: (id: symbol) => void;
	openReceive: (id: symbol) => void;
	openSend: (id: symbol) => void;
	openBuy: (id: symbol) => void;
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
	openEthToken: () => void;
	openIcToken: () => void;
	openReceiveBitcoin: () => void;
	openAboutWhyOisy: () => void;
	openDappDetails: <D extends T>(data: D) => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	const setType = (type: Modal<T>['type']) => () => set({ type });

	const setTypeWithId = (type: Modal<T>['type']) => (id: symbol) => set({ type, id });

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
		openSolReceive: setTypeWithId('sol-receive'),
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
		openEthToken: setType('eth-token'),
		openIcToken: setType('ic-token'),
		openReceiveBitcoin: setType('receive-bitcoin'),
		openAboutWhyOisy: setType('about-why-oisy'),
		openDappDetails: setTypeWithData('dapp-details'),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
