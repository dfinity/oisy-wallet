import type { RewardDescription } from '$env/types/env-reward';
import type { QrCodeType } from '$lib/enums/qr-code-types';
import type { SettingsModalType } from '$lib/enums/settings-modal-types';
import type { ManageTokensData } from '$lib/types/manage-tokens';
import type { VipRewardStateData } from '$lib/types/reward';
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
		| 'swap'
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
		| 'btc-transaction'
		| 'sol-transaction'
		| 'manage-tokens'
		| 'hide-token'
		| 'ic-hide-token'
		| 'eth-token'
		| 'btc-token'
		| 'ic-token'
		| 'sol-token'
		| 'receive-bitcoin'
		| 'about-why-oisy'
		| 'vip-qr-code'
		| 'referral-code'
		| 'referral-state'
		| 'address-book'
		| 'dapp-details'
		| 'vip-reward-state'
		| 'reward-details'
		| 'reward-state'
		| 'settings'
		| 'auth-help';
	data?: T;
	id?: symbol;
}

export type ModalData<T> = Option<Modal<T>>;

type SetWithDataParams<D> = { id: symbol; data: D };
type SetWithOptionalDataParams<D> = { id: symbol; data?: D };

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
	openSwap: (id: symbol) => void;
	openConvertCkBTCToBTC: () => void;
	openConvertBTCToCkBTC: () => void;
	openConvertToTwinTokenCkEth: () => void;
	openConvertToTwinTokenEth: () => void;
	openHowToConvertToTwinTokenEth: () => void;
	openWalletConnectAuth: () => void;
	openWalletConnectSign: <D extends T>(params: SetWithDataParams<D>) => void;
	openWalletConnectSend: <D extends T>(params: SetWithDataParams<D>) => void;
	openEthTransaction: <D extends T>(params: SetWithDataParams<D>) => void;
	openIcTransaction: <D extends T>(params: SetWithDataParams<D>) => void;
	openBtcTransaction: <D extends T>(params: SetWithDataParams<D>) => void;
	openSolTransaction: <D extends T>(params: SetWithDataParams<D>) => void;
	openManageTokens: (params: SetWithOptionalDataParams<ManageTokensData>) => void;
	openHideToken: () => void;
	openIcHideToken: () => void;
	openEthToken: () => void;
	openBtcToken: () => void;
	openIcToken: () => void;
	openSolToken: () => void;
	openReceiveBitcoin: () => void;
	openAboutWhyOisy: () => void;
	openVipQrCode: (params: SetWithDataParams<QrCodeType>) => void;
	openReferralCode: () => void;
	openAddressBook: () => void;
	openReferralState: () => void;
	openDappDetails: <D extends T>(params: SetWithDataParams<D>) => void;
	openVipRewardState: (params: SetWithDataParams<VipRewardStateData>) => void;
	openRewardDetails: (params: SetWithDataParams<RewardDescription>) => void;
	openRewardState: <D extends T>(params: SetWithDataParams<D>) => void;
	// todo: type methods above accordingly, otherwise data will be typed as unknown without making use of generics
	openSettings: (params: SetWithDataParams<SettingsModalType>) => void;
	openAuthHelp: (params: SetWithDataParams<boolean>) => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	const setType = (type: Modal<T>['type']) => () => set({ type });

	const setTypeWithId = (type: Modal<T>['type']) => (id: symbol) => set({ type, id });

	const setTypeWithData =
		(type: Modal<T>['type']) =>
		<D extends T>({ id, data }: { id: symbol; data: D }) =>
			set({ type, id, data });

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
		openSwap: setTypeWithId('swap'),
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
		openSolTransaction: setTypeWithData('sol-transaction'),
		openManageTokens: <(params: SetWithOptionalDataParams<ManageTokensData>) => void>(
			setTypeWithData('manage-tokens')
		),
		openHideToken: setType('hide-token'),
		openIcHideToken: setType('ic-hide-token'),
		openEthToken: setType('eth-token'),
		openBtcToken: setType('btc-token'),
		openIcToken: setType('ic-token'),
		openSolToken: setType('sol-token'),
		openReceiveBitcoin: setType('receive-bitcoin'),
		openAboutWhyOisy: setType('about-why-oisy'),
		openVipQrCode: <(params: SetWithDataParams<QrCodeType>) => void>setTypeWithData('vip-qr-code'),
		openReferralCode: setType('referral-code'),
		openAddressBook: setType('address-book'),
		openReferralState: setType('referral-state'),
		openDappDetails: setTypeWithData('dapp-details'),
		openVipRewardState: <(params: SetWithDataParams<VipRewardStateData>) => void>(
			setTypeWithData('vip-reward-state')
		),
		openRewardDetails: <(params: SetWithDataParams<RewardDescription>) => void>(
			setTypeWithData('reward-details')
		),
		openRewardState: setTypeWithData('reward-state'),
		// todo: explicitly define type here as well
		openSettings: <(params: SetWithDataParams<SettingsModalType>) => void>(
			setTypeWithData('settings')
		),
		openAuthHelp: <(params: SetWithDataParams<boolean>) => void>setTypeWithData('auth-help'),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
