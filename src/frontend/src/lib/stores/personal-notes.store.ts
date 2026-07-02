import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
import type { PersonalNoteEntryUi } from '$lib/types/personal-note';
import { comparePersonalNotesByUpdatedDesc } from '$lib/utils/personal-note.utils';
import { derived, writable, type Readable, type Writable } from 'svelte/store';

export interface PersonalNotesStoreData {
	/** Decrypted entries keyed by note id; cleartext lives in memory only. `undefined` until first load (or an optimistic write). */
	entries: Record<string, PersonalNoteEntryUi> | undefined;
	/** Total note count reported by the backend (drives the capacity gate). */
	count: number;
	/** Whether notes have been loaded once this session (the lazy-load guard). */
	loaded: boolean;
}

const EMPTY_DATA: PersonalNotesStoreData = { entries: undefined, count: 0, loaded: false };

export interface PersonalNotesStore extends Readable<PersonalNotesStoreData> {
	/** Replace the cache with a freshly loaded set and mark the store loaded. */
	setLoaded: (params: { entries: PersonalNoteEntryUi[]; count: number }) => void;
	/** Add or replace a single entry (optimistic write). */
	upsert: (entry: PersonalNoteEntryUi) => void;
	/** Remove an entry by id (optimistic delete). */
	remove: (id: string) => void;
	/** Update the authoritative count after a write. */
	setCount: (count: number) => void;
	reset: () => void;
}

const initPersonalNotesStore = (): PersonalNotesStore => {
	const { subscribe, set, update }: Writable<PersonalNotesStoreData> =
		writable<PersonalNotesStoreData>(EMPTY_DATA);

	const toRecord = (entries: PersonalNoteEntryUi[]): Record<string, PersonalNoteEntryUi> => {
		const record: Record<string, PersonalNoteEntryUi> = {};
		for (const entry of entries) {
			record[entry.id] = entry;
		}
		return record;
	};

	return {
		subscribe,
		setLoaded: ({ entries, count }) => set({ entries: toRecord(entries), count, loaded: true }),
		upsert: (entry) =>
			update((data) => ({
				...data,
				entries: { ...(data.entries ?? {}), [entry.id]: entry }
			})),
		remove: (id) =>
			update((data) => {
				const { [id]: _removed, ...rest } = data.entries ?? {};
				return { ...data, entries: rest };
			}),
		setCount: (count) => update((data) => ({ ...data, count })),
		reset: () => set(EMPTY_DATA)
	};
};

export const personalNotesStore = initPersonalNotesStore();

/** Decrypted notes, newest-first; `undefined` until the first load completes. */
export const personalNotesList: Readable<PersonalNoteEntryUi[] | undefined> = derived(
	personalNotesStore,
	({ entries }) =>
		entries === undefined
			? undefined
			: Object.values(entries).sort((a, b) => comparePersonalNotesByUpdatedDesc({ a, b }))
);

export const personalNotesLoaded: Readable<boolean> = derived(
	personalNotesStore,
	({ loaded }) => loaded
);

/** True when the user is at the per-user cap; the UI disables "Add note". */
export const atPersonalNotesCapacity: Readable<boolean> = derived(
	personalNotesStore,
	({ count }) => count >= MAX_PERSONAL_NOTES_PER_USER
);
