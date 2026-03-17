import type { OptionWalletConnectListener, WalletConnectListener } from '$lib/types/wallet-connect';
import type { Nullish } from '@dfinity/zod-schemas';
import type { WalletKitTypes } from '@reown/walletkit';
import { type Readable, writable } from 'svelte/store';

type WalletConnectListenerStoreData = OptionWalletConnectListener;

interface WalletConnectListenerStore extends Readable<WalletConnectListenerStoreData> {
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

type WalletConnectProposalStoreData = Nullish<WalletKitTypes.SessionProposal>;

interface WalletConnectProposalStore extends Readable<WalletConnectProposalStoreData> {
	set: (data: WalletKitTypes.SessionProposal) => void;
}

const initWalletConnectProposalStore = (): WalletConnectProposalStore => {
	const { subscribe, set } = writable<WalletConnectProposalStoreData>(undefined);

	return {
		subscribe,
		set: (data: WalletKitTypes.SessionProposal) => set(data)
	};
};

export const walletConnectProposalStore = initWalletConnectProposalStore();
