import type { IcToken } from '$icp/types/ic-token';
import {
	hiddenInfoQualifiers,
	saveHideInfoQualifiers,
	type HideInfoKey
} from '$lib/utils/info.utils';
import { writable, type Readable } from 'svelte/store';

const UNAVAILABLE_INDEX_CANISTER_HIDE_KEY: HideInfoKey =
	'oisy_ic_hide_transaction_unavailable_canister';

export interface IcTransactionsWarningStore extends Readable<string[]> {
	dismiss: (tokens: IcToken[]) => void;
	forget: (ledgerCanisterIds: string[]) => void;
	reset: () => void;
}

/**
 * The Ledger canister IDs whose "transactions unavailable" warning the user has dismissed.
 *
 * A store rather than component state because the warning is raised in more than one place - the
 * Activity page and the token page - and dismissing it in one has to silence the other
 * immediately. The session storage it writes through to is not reactive, so reading it per
 * component would let the two drift apart until the next reload.
 *
 * Identified by Ledger canister ID, never by symbol: a user can hold two tokens sharing a symbol,
 * and a dismissal recorded against the symbol would silence both.
 */
const initIcTransactionsWarningStore = (): IcTransactionsWarningStore => {
	const { subscribe, update } = writable<string[]>(
		hiddenInfoQualifiers(UNAVAILABLE_INDEX_CANISTER_HIDE_KEY)
	);

	// Written through on every change, so the dismissal survives a reload within the session.
	const save = (qualifiers: string[]): string[] => {
		saveHideInfoQualifiers({ key: UNAVAILABLE_INDEX_CANISTER_HIDE_KEY, qualifiers });

		return qualifiers;
	};

	return {
		subscribe,

		dismiss: (tokens: IcToken[]) =>
			update((dismissed) =>
				save([
					...dismissed,
					...tokens
						.map(({ ledgerCanisterId }) => ledgerCanisterId)
						.filter((ledgerCanisterId) => !dismissed.includes(ledgerCanisterId))
				])
			),

		// A dismissal covers one outage, not the session: a token whose Index canister answers again
		// is forgotten, so a later failure is surfaced afresh.
		forget: (ledgerCanisterIds: string[]) =>
			update((dismissed) => {
				const remaining = dismissed.filter(
					(ledgerCanisterId) => !ledgerCanisterIds.includes(ledgerCanisterId)
				);

				return remaining.length === dismissed.length ? dismissed : save(remaining);
			}),

		reset: () => update(() => save([]))
	};
};

export const icTransactionsWarningStore = initIcTransactionsWarningStore();
