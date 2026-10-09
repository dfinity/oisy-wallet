import type { ActiveUserTransaction } from '$declarations/backend/backend.did';
import { isTerminalActiveUserTransaction } from '$lib/utils/active-user-transactions.utils';
import { del as storageDel, get as storageGet, set as storageSet } from '$lib/utils/storage.utils';
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

// Rows this browser sent a terminal status for: such a write can commit after the tab that sent it
// is gone, before anything reported its outcome, so a load leaves these rows to the loader. Kept
// apart from the state above, which each tab saves whole from its own copy, and one key per
// principal and row, so that no tab ever rewrites another tab's markers: a marker is only set or
// removed, and read from storage when a load decides what to claim.
const TERMINAL_WRITE_PREFIX = 'aut:terminal-write:';

const terminalWritePrefix = (principal: Principal): string =>
	`${TERMINAL_WRITE_PREFIX}${principal.toText()}:`;

export interface ActiveUserTransactionsStore extends Readable<ActiveUserTransactionsStoreData> {
	init: (principal: Principal) => void;
	/** Whether the store holds this principal's rows, which an account switch can change mid-await. */
	holds: (principal: Principal) => boolean;
	/**
	 * Marks the start of a load, to pass to `set` as `since` once its snapshot returns. A row written
	 * locally after this mark survives a snapshot that lacks it: the snapshot was read before the
	 * write committed, not after the row went away.
	 */
	beginLoad: () => number;
	set: (params: { transactions: ActiveUserTransaction[]; since?: number }) => void;
	upsert: (params: { transaction: ActiveUserTransaction }) => void;
	remove: (params: { id: string }) => void;
	markAllSeen: () => void;
	markTerminalSideEffectsApplied: (params: { ids: string[] }) => void;
	/**
	 * Records, before the write is sent, that this browser is sending a row its terminal status. For
	 * the principal given, whichever one the store holds by then.
	 */
	markTerminalWriteSent: (params: { principal: Principal; id: string }) => void;
	reset: () => void;
}

const initStore = (): ActiveUserTransactionsStore => {
	const store: Writable<ActiveUserTransactionsStoreData> = writable(undefined);
	let storageKey: string | undefined;
	let terminalWriteKeyPrefix: string | undefined;

	// A local write order, so a load can tell a row written after it began from one its snapshot no
	// longer has. Per row, the sequence number of its last accepted local write.
	let writeSequence = 0;
	let lastLocalWrite: Record<string, number> = {};

	const persist = (state: ActiveUserTransactionsLocalState) => {
		if (isNullish(storageKey)) {
			return;
		}
		storageSet({ key: storageKey, value: state });
	};

	const stateKey = (principal: Principal): string => `${STORAGE_PREFIX}${principal.toText()}`;

	const init: ActiveUserTransactionsStore['init'] = (principal) => {
		const key = stateKey(principal);

		if (storageKey === key) {
			return;
		}

		storageKey = key;
		terminalWriteKeyPrefix = terminalWritePrefix(principal);
		lastLocalWrite = {};

		const persisted = storageGet<Partial<ActiveUserTransactionsLocalState>>({ key }) ?? {};

		store.set({
			data: {},
			lastSeenUpdatedAtNs: persisted.lastSeenUpdatedAtNs ?? {},
			terminalSideEffectsApplied: persisted.terminalSideEffectsApplied ?? {}
		});
	};

	const holds: ActiveUserTransactionsStore['holds'] = (principal) =>
		storageKey === stateKey(principal);

	const beginLoad: ActiveUserTransactionsStore['beginLoad'] = () => writeSequence;

	// Merges rather than replaces. A load reads its snapshot asynchronously, and a create or update
	// that commits while the read is in flight is already in the store by the time the snapshot lands
	// — replacing wholesale erased it, and a row gone from the store is a row the poller never
	// resolves.
	const setAll: ActiveUserTransactionsStore['set'] = ({ transactions, since }) => {
		store.update((current) => {
			if (isNullish(current)) {
				return current;
			}

			const data: Record<string, ActiveUserTransaction> = {};

			// The newer copy wins, by the rule `upsert` applies: a local row newer than the snapshot's
			// is a write that landed after the snapshot was read.
			for (const tx of transactions) {
				const local = current.data[tx.id];

				data[tx.id] = nonNullish(local) && local.updated_at_ns > tx.updated_at_ns ? local : tx;
			}

			// A row the snapshot lacks is gone — deleted elsewhere, or pruned — unless it was written
			// locally after this load began, in which case the snapshot is simply older than it.
			if (nonNullish(since)) {
				for (const [id, local] of Object.entries(current.data)) {
					if (!(id in data) && (lastLocalWrite[id] ?? 0) > since) {
						data[id] = local;
					}
				}
			}

			lastLocalWrite = Object.fromEntries(
				Object.entries(lastLocalWrite).filter(([id]) => id in data)
			);

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

			// A row first met already settled was settled, and reported, by another device or an earlier
			// session, so it is claimed without firing. Otherwise signing in on a new device replays the
			// outcome of every row not yet dismissed. A row this tab already holds is left to the loader,
			// and so is one this browser sent the terminal status for.
			const sentHere = (id: string): boolean =>
				nonNullish(terminalWriteKeyPrefix) &&
				storageGet<boolean>({ key: `${terminalWriteKeyPrefix}${id}` }) === true;
			let claimedAny = false;

			for (const [id, tx] of Object.entries(data)) {
				if (
					!(id in current.data) &&
					isTerminalActiveUserTransaction(tx) &&
					!terminalSideEffectsApplied[id] &&
					!sentHere(id)
				) {
					terminalSideEffectsApplied[id] = true;
					claimedAny = true;
				}
			}

			if (prunedAny || claimedAny) {
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

			writeSequence += 1;
			lastLocalWrite = { ...lastLocalWrite, [transaction.id]: writeSequence };

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
			const { [id]: _removedWrite, ...remainingWrites } = lastLocalWrite;
			lastLocalWrite = remainingWrites;
			const { [id]: _removedSeen, ...lastSeenUpdatedAtNs } = current.lastSeenUpdatedAtNs;
			const { [id]: _removedApplied, ...terminalSideEffectsApplied } =
				current.terminalSideEffectsApplied;

			persist({ lastSeenUpdatedAtNs, terminalSideEffectsApplied });

			if (nonNullish(terminalWriteKeyPrefix)) {
				storageDel({ key: `${terminalWriteKeyPrefix}${id}` });
			}

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

				// Reported, or claimed by the flow that reports it, so the marker has done its job.
				if (nonNullish(terminalWriteKeyPrefix)) {
					for (const id of ids) {
						storageDel({ key: `${terminalWriteKeyPrefix}${id}` });
					}
				}

				return { ...current, terminalSideEffectsApplied };
			});
		};

	const markTerminalWriteSent: ActiveUserTransactionsStore['markTerminalWriteSent'] = ({
		principal,
		id
	}) => {
		// The OISY Trade foreground claims its row before it writes it, and nothing would clear this.
		const alreadyApplied =
			storageGet<Partial<ActiveUserTransactionsLocalState>>({ key: stateKey(principal) })
				?.terminalSideEffectsApplied?.[id] === true;

		if (alreadyApplied) {
			return;
		}

		storageSet({ key: `${terminalWritePrefix(principal)}${id}`, value: true });
	};

	const reset: ActiveUserTransactionsStore['reset'] = () => {
		storageKey = undefined;
		terminalWriteKeyPrefix = undefined;
		lastLocalWrite = {};
		store.set(undefined);
	};

	return {
		subscribe: store.subscribe,
		init,
		holds,
		beginLoad,
		set: setAll,
		upsert,
		remove,
		markAllSeen,
		markTerminalSideEffectsApplied,
		markTerminalWriteSent,
		reset
	};
};

export const activeUserTransactionsStore: ActiveUserTransactionsStore = initStore();
