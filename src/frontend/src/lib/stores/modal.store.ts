import type { BtcTransactionUi } from '$btc/types/btc';
import type { RewardDescription } from '$env/types/env-reward';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { QrCodeType } from '$lib/enums/qr-code-types';
import type { SettingsModalType } from '$lib/enums/settings-modal-types';
import { addressBookStore } from '$lib/stores/address-book.store';
import type { AddressBookModalParams } from '$lib/types/address-book';
import type { OisyDappDescription } from '$lib/types/dapp-description';
import type { ManageTokensData } from '$lib/types/manage-tokens';
import type { VipRewardStateData } from '$lib/types/reward';
import type { Token } from '$lib/types/token';
import type { AnyTransactionUi } from '$lib/types/transaction';
import type { Option } from '$lib/types/utils';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { WalletKitTypes } from '@reown/walletkit';
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

interface SetWithDataParams<D> {
	id: symbol;
	data: D;
}
interface SetWithOptionalDataParams<D> {
	id: symbol;
	data?: D;
}

interface OpenTransactionParams<T extends AnyTransactionUi> {
	transaction: T;
	token: Token;
}

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
	openConvertCkBTCToBTC: (id: symbol) => void;
	openConvertBTCToCkBTC: (id: symbol) => void;
	openConvertToTwinTokenCkEth: (id: symbol) => void;
	openConvertToTwinTokenEth: (id: symbol) => void;
	openHowToConvertToTwinTokenEth: (id: symbol) => void;
	openWalletConnectAuth: (id: symbol) => void;
	openWalletConnectSign: (params: SetWithDataParams<WalletKitTypes.SessionRequest>) => void;
	openWalletConnectSend: (params: SetWithDataParams<WalletKitTypes.SessionRequest>) => void;
	openEthTransaction: (params: SetWithDataParams<OpenTransactionParams<EthTransactionUi>>) => void;
	openIcTransaction: (params: SetWithDataParams<OpenTransactionParams<IcTransactionUi>>) => void;
	openBtcTransaction: (params: SetWithDataParams<OpenTransactionParams<BtcTransactionUi>>) => void;
	openSolTransaction: (params: SetWithDataParams<OpenTransactionParams<SolTransactionUi>>) => void;
	openManageTokens: (params: SetWithOptionalDataParams<ManageTokensData>) => void;
	openHideToken: (id: symbol) => void;
	openIcHideToken: (id: symbol) => void;
	openEthToken: (id: symbol) => void;
	openBtcToken: (id: symbol) => void;
	openIcToken: (id: symbol) => void;
	openSolToken: (id: symbol) => void;
	openReceiveBitcoin: (id: symbol) => void;
	openAboutWhyOisy: (id: symbol) => void;
	openVipQrCode: (params: SetWithDataParams<QrCodeType>) => void;
	openReferralCode: (id: symbol) => void;
	openAddressBook: (params: SetWithOptionalDataParams<AddressBookModalParams>) => void;
	openReferralState: (id: symbol) => void;
	openDappDetails: (params: SetWithDataParams<OisyDappDescription>) => void;
	openVipRewardState: (params: SetWithDataParams<VipRewardStateData>) => void;
	openRewardDetails: (params: SetWithDataParams<RewardDescription>) => void;
	openRewardState: (params: SetWithDataParams<boolean>) => void;
	openSettings: (params: SetWithDataParams<SettingsModalType>) => void;
	openAuthHelp: (params: SetWithDataParams<boolean>) => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	const setType =
		({ type, cb }: { type: Modal<T>['type']; cb?: () => void }) =>
		(id: symbol) => {
			set({ type, id });
			cb?.();
		};

	const setTypeWithData =
		({ type, cb }: { type: Modal<T>['type']; cb?: () => void }) =>
		<D extends T>({ id, data }: { id: symbol; data: D }) => {
			set({ type, id, data });
			cb?.();
		};

	return {
		openEthReceive: setType({ type: 'eth-receive' }),
		openIcpReceive: setType({ type: 'icp-receive' }),
		openIcrcReceive: setType({ type: 'icrc-receive' }),
		openCkBTCReceive: setType({ type: 'ckbtc-receive' }),
		openCkETHReceive: setType({ type: 'cketh-receive' }),
		openBtcReceive: setType({ type: 'btc-receive' }),
		openSolReceive: setType({ type: 'sol-receive' }),
		openReceive: setType({ type: 'receive' }),
		openSend: setType({ type: 'send' }),
		openBuy: setType({ type: 'buy' }),
		openSwap: setType({ type: 'swap' }),
		openConvertCkBTCToBTC: setType({ type: 'convert-ckbtc-btc' }),
		openConvertBTCToCkBTC: setType({ type: 'convert-btc-ckbtc' }),
		openConvertToTwinTokenCkEth: setType({ type: 'convert-to-twin-token-cketh' }),
		openConvertToTwinTokenEth: setType({ type: 'convert-to-twin-token-eth' }),
		openHowToConvertToTwinTokenEth: setType({ type: 'how-to-convert-to-twin-token-eth' }),
		openWalletConnectAuth: setType({ type: 'wallet-connect-auth' }),
		openWalletConnectSign: <(params: SetWithDataParams<WalletKitTypes.SessionRequest>) => void>(
			setTypeWithData({ type: 'wallet-connect-sign' })
		),
		openWalletConnectSend: <(params: SetWithDataParams<WalletKitTypes.SessionRequest>) => void>(
			setTypeWithData({ type: 'wallet-connect-send' })
		),
		openEthTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<EthTransactionUi>>) => void
		>setTypeWithData({ type: 'eth-transaction' }),
		openIcTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<IcTransactionUi>>) => void
		>setTypeWithData({ type: 'ic-transaction' }),
		openBtcTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<BtcTransactionUi>>) => void
		>setTypeWithData({ type: 'btc-transaction' }),
		openSolTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<SolTransactionUi>>) => void
		>setTypeWithData({ type: 'sol-transaction' }),
		openManageTokens: <(params: SetWithOptionalDataParams<ManageTokensData>) => void>(
			setTypeWithData({ type: 'manage-tokens' })
		),
		openHideToken: setType({ type: 'hide-token' }),
		openIcHideToken: setType({ type: 'ic-hide-token' }),
		openEthToken: setType({ type: 'eth-token' }),
		openBtcToken: setType({ type: 'btc-token' }),
		openIcToken: setType({ type: 'ic-token' }),
		openSolToken: setType({ type: 'sol-token' }),
		openReceiveBitcoin: setType({ type: 'receive-bitcoin' }),
		openAboutWhyOisy: setType({ type: 'about-why-oisy' }),
		openVipQrCode: <(params: SetWithDataParams<QrCodeType>) => void>(
			setTypeWithData({ type: 'vip-qr-code' })
		),
		openReferralCode: setType({ type: 'referral-code' }),
		openAddressBook: <(params: SetWithOptionalDataParams<AddressBookModalParams>) => void>(
			setTypeWithData({ type: 'address-book', cb: () => addressBookStore.reset() })
		),
		openReferralState: setType({ type: 'referral-state' }),
		openDappDetails: <(params: SetWithDataParams<OisyDappDescription>) => void>(
			setTypeWithData({ type: 'dapp-details' })
		),
		openVipRewardState: <(params: SetWithDataParams<VipRewardStateData>) => void>(
			setTypeWithData({ type: 'vip-reward-state' })
		),
		openRewardDetails: <(params: SetWithDataParams<RewardDescription>) => void>(
			setTypeWithData({ type: 'reward-details' })
		),
		openRewardState: <(params: SetWithDataParams<boolean>) => void>(
			setTypeWithData({ type: 'reward-state' })
		),
		openSettings: <(params: SetWithDataParams<SettingsModalType>) => void>(
			setTypeWithData({ type: 'settings' })
		),
		openAuthHelp: <(params: SetWithDataParams<boolean>) => void>(
			setTypeWithData({ type: 'auth-help' })
		),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
