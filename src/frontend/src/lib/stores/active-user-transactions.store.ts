import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { get as storageGet, set as storageSet } from '$lib/utils/storage.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import type { Principal } from '@icp-sdk/core/principal';
import { writable, type Readable, type Writable } from 'svelte/store';

// Persisted per-principal so terminal side-effects don't re-fire across
// sessions and unseen badges survive a refresh.
export interface ActiveUserTransactionsLocalState {
	lastSeenUpdatedAtNs: Record<string, string>;
	terminalSideEffectsApplied: Record<string, true>;
}

export type ActiveUserTransactionsStoreData =
	| ({
			data: Record<string, ActiveUserTransaction>;
	  } & ActiveUserTransactionsLocalState)
	| undefined;

const STORAGE_PREFIX = 'aut:state:';

export interface ActiveUserTransactionsStore extends Readable<ActiveUserTransactionsStoreData> {
	init: (principal: Principal) => void;
	set: (params: { transactions: ActiveUserTransaction[] }) => void;
	upsert: (params: { transaction: ActiveUserTransaction }) => void;
	remove: (params: { id: string }) => void;
	markAllSeen: () => void;
	markTerminalSideEffectsApplied: (params: { ids: string[] }) => void;
	reset: () => void;
}

const initStore = (): ActiveUserTransactionsStore => {
	const store: Writable<ActiveUserTransactionsStoreData> = writable(undefined);
	let storageKey: string | undefined;

	const persist = (state: ActiveUserTransactionsLocalState) => {
		if (isNullish(storageKey)) {
			return;
		}
		storageSet({ key: storageKey, value: state });
	};

	const init: ActiveUserTransactionsStore['init'] = (principal) => {
		const key = `${STORAGE_PREFIX}${principal.toText()}`;

		if (storageKey === key) {
			return;
		}

		storageKey = key;

		const persisted = storageGet<Partial<ActiveUserTransactionsLocalState>>({ key }) ?? {};

		store.set({
			data: {},
			lastSeenUpdatedAtNs: persisted.lastSeenUpdatedAtNs ?? {},
			terminalSideEffectsApplied: persisted.terminalSideEffectsApplied ?? {}
		});
	};

	const setAll: ActiveUserTransactionsStore['set'] = ({ transactions }) => {
		store.update((current) => {
			if (isNullish(current)) {
				return current;
			}

			const data: Record<string, ActiveUserTransaction> = {};

			for (const tx of transactions) {
				data[tx.id] = tx;
			}

			const lastSeenUpdatedAtNs: Record<string, string> = {};
			const terminalSideEffectsApplied: Record<string, true> = {};
			let prunedAny = false;

			for (const [id, seen] of Object.entries(current.lastSeenUpdatedAtNs)) {
				if (id in data) {
					lastSeenUpdatedAtNs[id] = seen;
				} else {
					prunedAny = true;
				}
			}

			for (const id of Object.keys(current.terminalSideEffectsApplied)) {
				if (id in data) {
					terminalSideEffectsApplied[id] = true;
				} else {
					prunedAny = true;
				}
			}

			if (prunedAny) {
				persist({ lastSeenUpdatedAtNs, terminalSideEffectsApplied });
			}

			return { ...current, data, lastSeenUpdatedAtNs, terminalSideEffectsApplied };
		});
	};

	const upsert: ActiveUserTransactionsStore['upsert'] = ({ transaction }) => {
		store.update((current) => {
			if (isNullish(current)) {
				return current;
			}

			const existing = current.data[transaction.id];

			if (nonNullish(existing) && existing.updated_at_ns > transaction.updated_at_ns) {
				return current;
			}

			return {
				...current,
				data: { ...current.data, [transaction.id]: transaction }
			};
		});
	};

	const remove: ActiveUserTransactionsStore['remove'] = ({ id }) => {
		store.update((current) => {
			if (isNullish(current)) {
				return current;
			}

			const { [id]: _removedTx, ...data } = current.data;
			const { [id]: _removedSeen, ...lastSeenUpdatedAtNs } = current.lastSeenUpdatedAtNs;
			const { [id]: _removedApplied, ...terminalSideEffectsApplied } =
				current.terminalSideEffectsApplied;

			persist({ lastSeenUpdatedAtNs, terminalSideEffectsApplied });

			return { ...current, data, lastSeenUpdatedAtNs, terminalSideEffectsApplied };
		});
	};

	const markAllSeen: ActiveUserTransactionsStore['markAllSeen'] = () => {
		store.update((current) => {
			if (isNullish(current)) {
				return current;
			}

			const lastSeenUpdatedAtNs = { ...current.lastSeenUpdatedAtNs };
			let changed = false;

			for (const tx of Object.values(current.data)) {
				const next = tx.updated_at_ns.toString();

				if (lastSeenUpdatedAtNs[tx.id] !== next) {
					lastSeenUpdatedAtNs[tx.id] = next;
					changed = true;
				}
			}

			if (!changed) {
				return current;
			}

			persist({
				lastSeenUpdatedAtNs,
				terminalSideEffectsApplied: current.terminalSideEffectsApplied
			});

			return { ...current, lastSeenUpdatedAtNs };
		});
	};

	const markTerminalSideEffectsApplied: ActiveUserTransactionsStore['markTerminalSideEffectsApplied'] =
		({ ids }) => {
			store.update((current) => {
				if (isNullish(current) || ids.length === 0) {
					return current;
				}

				const terminalSideEffectsApplied = { ...current.terminalSideEffectsApplied };
				let changed = false;

				for (const id of ids) {
					if (!terminalSideEffectsApplied[id]) {
						terminalSideEffectsApplied[id] = true;
						changed = true;
					}
				}

				if (!changed) {
					return current;
				}

				persist({
					lastSeenUpdatedAtNs: current.lastSeenUpdatedAtNs,
					terminalSideEffectsApplied
				});

				return { ...current, terminalSideEffectsApplied };
			});
		};

	const reset: ActiveUserTransactionsStore['reset'] = () => {
		storageKey = undefined;
		store.set(undefined);
	};

	return {
		subscribe: store.subscribe,
		init,
		set: setAll,
		upsert,
		remove,
		markAllSeen,
		markTerminalSideEffectsApplied,
		reset
	};
};

export const activeUserTransactionsStore: ActiveUserTransactionsStore = initStore();
