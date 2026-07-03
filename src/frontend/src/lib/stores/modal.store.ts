import type { BtcTransactionUi } from '$btc/types/btc';
import type { RewardCampaignDescription } from '$env/types/env-reward';
import type { EthTransactionUi } from '$eth/types/eth-transaction';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import type { QrCodeType } from '$lib/enums/qr-code-types';
import type { SettingsModalType } from '$lib/enums/settings-modal-types';
import type { AddressBookModalParams } from '$lib/types/address-book';
import type { OisyDappDescription } from '$lib/types/dapp-description';
import type { ManageTokensData } from '$lib/types/manage-tokens';
import type { Nft, NftCollection } from '$lib/types/nft';
import type { OisyTradeOrderView, OisyTradeWithdrawToken } from '$lib/types/oisy-trade';
import type { RewardStateData, VipRewardStateData, WelcomeData } from '$lib/types/reward';
import type { UniversalScannerData } from '$lib/types/scanner';
import type { SendModalData } from '$lib/types/send';
import type { Token } from '$lib/types/token';
import type { AnyTransactionUi } from '$lib/types/transaction-ui';
import type { SolTransactionUi } from '$sol/types/sol-transaction';
import type { Nullish } from '@dfinity/zod-schemas';
import type { WalletKitTypes } from '@reown/walletkit';
import type { NavigationTarget } from '@sveltejs/kit';
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
		| 'sol-hide-token'
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
		| 'notes'
		| 'dapp-details'
		| 'vip-reward-state'
		| 'reward-details'
		| 'reward-state'
		| 'welcome'
		| 'settings'
		| 'auth-help'
		| 'nft-image-consent'
		| 'nft-fullscreen-display'
		| 'get-token'
		| 'harvest-stake'
		| 'harvest-unstake'
		| 'liquidium-supply'
		| 'trading-deposit'
		| 'oisy-trade-withdraw'
		| 'oisy-trade-order-detail'
		| 'limit-order'
		| 'liquidium-borrow'
		| 'liquidium-withdraw'
		| 'liquidium-repay'
		| 'universal-scanner'
		| 'pay-dialog'
		| 'wallet-connect-sessions';
	data?: T;
	id?: symbol;
}

export type ModalData<T> = Nullish<Modal<T>>;

interface SetWithDataParams<D> {
	id: symbol;
	data: D;
}
interface SetWithOptionalDataParams<D> {
	id: symbol;
	data?: D;
}

export interface OpenTransactionParams<T extends AnyTransactionUi> {
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
	openSend: (params: SetWithOptionalDataParams<SendModalData>) => void;
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
	openHideToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openIcHideToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openSolHideToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openEthToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openBtcToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openIcToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openSolToken: (params: SetWithDataParams<NavigationTarget | undefined>) => void;
	openReceiveBitcoin: (id: symbol) => void;
	openAboutWhyOisy: (id: symbol) => void;
	openVipQrCode: (params: SetWithDataParams<QrCodeType>) => void;
	openReferralCode: (id: symbol) => void;
	openAddressBook: (params: SetWithOptionalDataParams<AddressBookModalParams>) => void;
	openNotes: (id: symbol) => void;
	openDappDetails: (params: SetWithDataParams<OisyDappDescription>) => void;
	openVipRewardState: (params: SetWithDataParams<VipRewardStateData>) => void;
	openRewardDetails: (params: SetWithDataParams<RewardCampaignDescription>) => void;
	openRewardState: (params: SetWithDataParams<RewardStateData>) => void;
	openWelcome: (params: SetWithDataParams<WelcomeData>) => void;
	openSettings: (params: SetWithDataParams<SettingsModalType>) => void;
	openAuthHelp: (params: SetWithDataParams<boolean>) => void;
	openNftImageConsent: (params: SetWithDataParams<NftCollection>) => void;
	openNftFullscreenDisplay: (params: SetWithDataParams<Nft>) => void;
	openHarvestStake: (id: symbol) => void;
	openHarvestUnstake: (id: symbol) => void;
	openLiquidiumSupply: (id: symbol) => void;
	openTradingDeposit: (id: symbol) => void;
	openOisyTradeWithdraw: (params: SetWithDataParams<OisyTradeWithdrawToken>) => void;
	openOisyTradeOrderDetail: (params: SetWithDataParams<OisyTradeOrderView>) => void;
	openLimitOrder: (id: symbol) => void;
	openLiquidiumBorrow: (id: symbol) => void;
	openLiquidiumWithdraw: (id: symbol) => void;
	openLiquidiumRepay: (id: symbol) => void;
	openUniversalScanner: (params: SetWithOptionalDataParams<UniversalScannerData>) => void;
	openPayDialog: (id: symbol) => void;
	openGetToken: (id: symbol) => void;
	openWalletConnectSessions: (id: symbol) => void;
	close: () => void;
}

const initModalStore = <T>(): ModalStore<T> => {
	const { subscribe, set } = writable<ModalData<T>>(undefined);

	const setType = (type: Modal<T>['type']) => (id: symbol) => set({ type, id });

	const setTypeWithData =
		(type: Modal<T>['type']) =>
		<D extends T>({ id, data }: { id: symbol; data: D }) =>
			set({ type, id, data });

	return {
		openEthReceive: setType('eth-receive'),
		openIcpReceive: setType('icp-receive'),
		openIcrcReceive: setType('icrc-receive'),
		openCkBTCReceive: setType('ckbtc-receive'),
		openCkETHReceive: setType('cketh-receive'),
		openBtcReceive: setType('btc-receive'),
		openSolReceive: setType('sol-receive'),
		openReceive: setType('receive'),
		openSend: <(params: SetWithOptionalDataParams<SendModalData>) => void>setTypeWithData('send'),
		openBuy: setType('buy'),
		openSwap: setType('swap'),
		openConvertCkBTCToBTC: setType('convert-ckbtc-btc'),
		openConvertBTCToCkBTC: setType('convert-btc-ckbtc'),
		openConvertToTwinTokenCkEth: setType('convert-to-twin-token-cketh'),
		openConvertToTwinTokenEth: setType('convert-to-twin-token-eth'),
		openHowToConvertToTwinTokenEth: setType('how-to-convert-to-twin-token-eth'),
		openWalletConnectAuth: setType('wallet-connect-auth'),
		openWalletConnectSign: <(params: SetWithDataParams<WalletKitTypes.SessionRequest>) => void>(
			setTypeWithData('wallet-connect-sign')
		),
		openWalletConnectSend: <(params: SetWithDataParams<WalletKitTypes.SessionRequest>) => void>(
			setTypeWithData('wallet-connect-send')
		),
		openEthTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<EthTransactionUi>>) => void
		>setTypeWithData('eth-transaction'),
		openIcTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<IcTransactionUi>>) => void
		>setTypeWithData('ic-transaction'),
		openBtcTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<BtcTransactionUi>>) => void
		>setTypeWithData('btc-transaction'),
		openSolTransaction: <
			(params: SetWithDataParams<OpenTransactionParams<SolTransactionUi>>) => void
		>setTypeWithData('sol-transaction'),
		openManageTokens: <(params: SetWithOptionalDataParams<ManageTokensData>) => void>(
			setTypeWithData('manage-tokens')
		),
		openHideToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('hide-token')
		),
		openIcHideToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('ic-hide-token')
		),
		openSolHideToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('sol-hide-token')
		),
		openEthToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('eth-token')
		),
		openBtcToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('btc-token')
		),
		openIcToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('ic-token')
		),
		openSolToken: <(params: SetWithDataParams<NavigationTarget | undefined>) => void>(
			setTypeWithData('sol-token')
		),
		openReceiveBitcoin: setType('receive-bitcoin'),
		openAboutWhyOisy: setType('about-why-oisy'),
		openVipQrCode: <(params: SetWithDataParams<QrCodeType>) => void>setTypeWithData('vip-qr-code'),
		openReferralCode: setType('referral-code'),
		openAddressBook: <(params: SetWithOptionalDataParams<AddressBookModalParams>) => void>(
			setTypeWithData('address-book')
		),
		openNotes: setType('notes'),
		openDappDetails: <(params: SetWithDataParams<OisyDappDescription>) => void>(
			setTypeWithData('dapp-details')
		),
		openVipRewardState: <(params: SetWithDataParams<VipRewardStateData>) => void>(
			setTypeWithData('vip-reward-state')
		),
		openRewardDetails: <(params: SetWithDataParams<RewardCampaignDescription>) => void>(
			setTypeWithData('reward-details')
		),
		openRewardState: <(params: SetWithDataParams<RewardStateData>) => void>(
			setTypeWithData('reward-state')
		),
		openWelcome: <(params: SetWithDataParams<WelcomeData>) => void>setTypeWithData('welcome'),
		openSettings: <(params: SetWithDataParams<SettingsModalType>) => void>(
			setTypeWithData('settings')
		),
		openAuthHelp: <(params: SetWithDataParams<boolean>) => void>setTypeWithData('auth-help'),
		openNftImageConsent: <(params: SetWithDataParams<NftCollection>) => void>(
			setTypeWithData('nft-image-consent')
		),
		openNftFullscreenDisplay: <(params: SetWithDataParams<Nft>) => void>(
			setTypeWithData('nft-fullscreen-display')
		),
		openHarvestStake: setType('harvest-stake'),
		openHarvestUnstake: setType('harvest-unstake'),
		openLiquidiumSupply: setType('liquidium-supply'),
		openTradingDeposit: setType('trading-deposit'),
		openOisyTradeWithdraw: <(params: SetWithDataParams<OisyTradeWithdrawToken>) => void>(
			setTypeWithData('oisy-trade-withdraw')
		),
		openOisyTradeOrderDetail: <(params: SetWithDataParams<OisyTradeOrderView>) => void>(
			setTypeWithData('oisy-trade-order-detail')
		),
		openLimitOrder: setType('limit-order'),
		openLiquidiumBorrow: setType('liquidium-borrow'),
		openLiquidiumWithdraw: setType('liquidium-withdraw'),
		openLiquidiumRepay: setType('liquidium-repay'),
		openUniversalScanner: <(params: SetWithOptionalDataParams<UniversalScannerData>) => void>(
			setTypeWithData('universal-scanner')
		),
		openPayDialog: setType('pay-dialog'),
		openGetToken: setType('get-token'),
		openWalletConnectSessions: setType('wallet-connect-sessions'),
		close: () => set(null),
		subscribe
	};
};

export const modalStore = initModalStore();
