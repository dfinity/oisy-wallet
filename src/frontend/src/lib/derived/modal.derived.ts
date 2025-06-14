import type { RewardDescription } from '$env/types/env-reward';
import type { QrCodeType } from '$lib/enums/qr-code-types';
import type { SettingsModalType } from '$lib/enums/settings-modal-types';
import { modalStore } from '$lib/stores/modal.store';
import type { ManageTokensData } from '$lib/types/manage-tokens';
import type { RewardStateData, VipRewardStateData } from '$lib/types/reward';
import { derived, type Readable } from 'svelte/store';

export const modalEthReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'eth-receive'
);
export const modalIcpReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'icp-receive'
);
export const modalIcrcReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'icrc-receive'
);
export const modalCkBTCReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ckbtc-receive'
);
export const modalCkETHReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'cketh-receive'
);
export const modalBtcReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'btc-receive'
);
export const modalSolReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'sol-receive'
);
export const modalReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'receive'
);
export const modalSend: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'send'
);
export const modalSwap: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'swap'
);
export const modalBuy: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'buy'
);
export const modalConvertCkBTCToBTC: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'convert-ckbtc-btc'
);
export const modalConvertBTCToCkBTC: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'convert-btc-ckbtc'
);
export const modalConvertToTwinTokenCkEth: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'convert-to-twin-token-cketh'
);
export const modalConvertToTwinTokenEth: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'convert-to-twin-token-eth'
);
export const modalHowToConvertToTwinTokenEth: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'how-to-convert-to-twin-token-eth'
);
export const modalWalletConnectAuth: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'wallet-connect-auth'
);
export const modalWalletConnectSign: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'wallet-connect-sign'
);
export const modalWalletConnectSend: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'wallet-connect-send'
);
export const modalEthTransaction: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'eth-transaction'
);
export const modalIcTransaction: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-transaction'
);
export const modalManageTokens: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'manage-tokens'
);
export const modalManageTokensData: Readable<ManageTokensData | undefined> = derived(
	modalStore,
	($modalStore) =>
		$modalStore?.type === 'manage-tokens' ? ($modalStore?.data as ManageTokensData) : undefined
);
export const modalHideToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'hide-token'
);
export const modalIcHideToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-hide-token'
);
export const modalBtcTransaction: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'btc-transaction'
);
export const modalSolTransaction: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'sol-transaction'
);
export const modalEthToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'eth-token'
);
export const modalBtcToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'btc-token'
);
export const modalIcToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-token'
);
export const modalSolToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'sol-token'
);
export const modalReceiveBitcoin: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'receive-bitcoin'
);
export const modalAboutWhyOisy: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'about-why-oisy'
);
export const modalVipQrCode: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'vip-qr-code'
);
export const modalVipQrCodeData: Readable<QrCodeType | undefined> = derived(
	modalStore,
	($modalStore) =>
		$modalStore?.type === 'vip-qr-code' ? ($modalStore?.data as QrCodeType) : undefined
);
export const modalReferralCode: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'referral-code'
);
export const modalReferralState: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'referral-state'
);
export const modalReferralStateData: Readable<RewardDescription> = derived(
	modalStore,
	($modalStore) => $modalStore?.data as RewardDescription
);
export const modalAddressBook: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'address-book'
);
export const modalDAppDetails: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'dapp-details'
);
export const modalVipRewardState: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'vip-reward-state'
);
export const modalVipRewardStateData: Readable<VipRewardStateData | undefined> = derived(
	modalStore,
	($modalStore) =>
		$modalStore?.type === 'vip-reward-state' ? ($modalStore?.data as VipRewardStateData) : undefined
);
export const modalRewardDetails: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'reward-details'
);
export const modalRewardDetailsData: Readable<RewardDescription | undefined> = derived(
	modalStore,
	($modalStore) =>
		$modalStore?.type === 'reward-details' ? ($modalStore?.data as RewardDescription) : undefined
);
export const modalRewardState: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'reward-state'
);
export const modalRewardStateData: Readable<RewardStateData | undefined> = derived(
	modalStore,
	($modalStore) =>
		$modalStore?.type === 'reward-state' ? ($modalStore?.data as RewardStateData) : undefined
);

export const modalWalletConnect: Readable<boolean> = derived(
	[modalWalletConnectAuth, modalWalletConnectSign, modalWalletConnectSend],
	([$modalWalletConnectAuth, $modalWalletConnectSign, $modalWalletConnectSend]) =>
		$modalWalletConnectAuth || $modalWalletConnectSign || $modalWalletConnectSend
);

export const modalSettingsState: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'settings'
);
export const modalSettingsData: Readable<SettingsModalType> = derived(
	modalStore,
	($modalStore) => $modalStore?.data as SettingsModalType
);

export const modalAuthHelp: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'auth-help'
);
export const modalAuthHelpData: Readable<boolean | undefined> = derived(
	modalStore,
	($modalStore) => ($modalStore?.type === 'auth-help' ? ($modalStore?.data as boolean) : undefined)
);
