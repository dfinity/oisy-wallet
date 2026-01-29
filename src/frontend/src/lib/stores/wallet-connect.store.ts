import type { Option } from '$lib/types/utils';
import type { OptionWalletConnectListener, WalletConnectListener } from '$lib/types/wallet-connect';
import type { WalletKitTypes } from '@reown/walletkit';
import { writable, type Readable } from 'svelte/store';

export type WalletConnectListenerStoreData = OptionWalletConnectListener;

export interface WalletConnectListenerStore extends Readable<WalletConnectListenerStoreData> {
	set: (data: WalletConnectListener) => void;
	reset: () => void;
}

const initWalletConnectListenerStore = (): WalletConnectListenerStore => {
	const { subscribe, set } = writable<WalletConnectListenerStoreData>(undefined);

	return {
		subscribe,
		set: (data: WalletConnectListener) => set(data),
		reset: () => {
			set(undefined);
		}
	};
};

export const walletConnectListenerStore = initWalletConnectListenerStore();

export type WalletConnectProposalStoreData = Option<WalletKitTypes.SessionProposal>;

export interface WalletConnectProposalStore extends Readable<WalletConnectProposalStoreData> {
	set: (data: WalletKitTypes.SessionProposal) => void;
}

const initWalletConnectProposalStore = (): WalletConnectProposalStore => {
	const { subscribe, set } = writable<WalletConnectProposalStoreData>(undefined);

	return {
		subscribe,
		set
	};
};

export const walletConnectProposalStore = initWalletConnectProposalStore();
