import type { LedgerCanisterIdText } from '$icp/types/canister';
import type { IcrcUnavailableCustomToken } from '$icp/types/icrc-custom-token';
import { writable, type Readable } from 'svelte/store';

export interface IcrcUnavailableCustomTokensStore extends Readable<IcrcUnavailableCustomToken[]> {
	set: (tokens: IcrcUnavailableCustomToken[]) => void;
	remove: (ledgerCanisterId: LedgerCanisterIdText) => void;
	isDeleted: (ledgerCanisterId: LedgerCanisterIdText) => boolean;
	forgetDeleted: (ledgerCanisterId: LedgerCanisterIdText) => void;
	reset: () => void;
}

const initIcrcUnavailableCustomTokensStore = (): IcrcUnavailableCustomTokensStore => {
	const { subscribe, set, update } = writable<IcrcUnavailableCustomToken[]>([]);

	// The ledgers the user deleted since the page loaded (signing out reloads it). A loading round
	// writes what it computed from the saved tokens it read at its start, so a round that read them
	// before a delete would otherwise put the deleted token back, here or in the main token list.
	// Saving the token again clears its mark.
	const deletedLedgerCanisterIds = new Set<LedgerCanisterIdText>();

	return {
		subscribe,

		set: (tokens: IcrcUnavailableCustomToken[]) =>
			set(tokens.filter(({ ledgerCanisterId }) => !deletedLedgerCanisterIds.has(ledgerCanisterId))),

		remove: (ledgerCanisterId: LedgerCanisterIdText) => {
			deletedLedgerCanisterIds.add(ledgerCanisterId);

			update((tokens) => tokens.filter(({ ledgerCanisterId: id }) => id !== ledgerCanisterId));
		},

		isDeleted: (ledgerCanisterId: LedgerCanisterIdText) =>
			deletedLedgerCanisterIds.has(ledgerCanisterId),

		forgetDeleted: (ledgerCanisterId: LedgerCanisterIdText) => {
			deletedLedgerCanisterIds.delete(ledgerCanisterId);
		},

		reset: () => {
			deletedLedgerCanisterIds.clear();

			set([]);
		}
	};
};

export const icrcUnavailableCustomTokensStore = initIcrcUnavailableCustomTokensStore();
