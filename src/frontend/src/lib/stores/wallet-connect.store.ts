import type { OptionWalletConnectListener, WalletConnectListener } from '$lib/types/wallet-connect';
import type { Nullish } from '@dfinity/zod-schemas';
import type { WalletKitTypes } from '@reown/walletkit';
import type { SessionTypes } from '@walletconnect/types';
import { writable, type Readable } from 'svelte/store';

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

type WalletConnectSessionsStoreData = SessionTypes.Struct[];

interface WalletConnectSessionsStore extends Readable<WalletConnectSessionsStoreData> {
	set: (data: WalletConnectSessionsStoreData) => void;
	reset: () => void;
}

// The listener wraps a singleton WalletKit, so its reference does not change when a session is
// added or removed. This store is the reactive source of truth for the connected-apps UI, kept in
// sync with `listener.getActiveSessions()` via `syncSessions()` in the services.
const initWalletConnectSessionsStore = (): WalletConnectSessionsStore => {
	const { subscribe, set } = writable<WalletConnectSessionsStoreData>([]);

	return {
		subscribe,
		set: (data: WalletConnectSessionsStoreData) => set(data),
		reset: () => {
			set([]);
		}
	};
};

export const walletConnectSessionsStore = initWalletConnectSessionsStore();
