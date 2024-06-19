import { modalStore } from '$lib/stores/modal.store';
import { derived, type Readable } from 'svelte/store';

export const modalReceive: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'receive'
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
export const modalSend: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'send'
);
export const modalConvertCkBTCToBTC: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'convert-ckbtc-btc'
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
export const modalIcSend: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-send'
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
export const modalTransaction: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'transaction'
);
export const modalIcTransaction: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-transaction'
);
export const modalAddToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'add-token'
);
export const modalManageTokens: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'manage-tokens'
);
export const modalHideToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'hide-token'
);
export const modalIcHideToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-hide-token'
);

export const modalToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'token'
);
export const modalIcToken: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'ic-token'
);
export const modalReceiveBitcoin: Readable<boolean> = derived(
	modalStore,
	($modalStore) => $modalStore?.type === 'receive-bitcoin'
);

export const modalWalletConnect: Readable<boolean> = derived(
	[modalWalletConnectAuth, modalWalletConnectSign, modalWalletConnectSend],
	([$modalWalletConnectAuth, $modalWalletConnectSign, $modalWalletConnectSend]) =>
		$modalWalletConnectAuth || $modalWalletConnectSign || $modalWalletConnectSend
);
