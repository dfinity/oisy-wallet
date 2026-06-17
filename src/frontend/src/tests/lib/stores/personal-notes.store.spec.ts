import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
import {
	atPersonalNotesCapacity,
	personalNotesList,
	personalNotesLoaded,
	personalNotesStore
} from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { get } from 'svelte/store';

const note = ({ id, updated }: { id: string; updated: string }): PersonalNoteUi => ({
	id,
	note: `note ${id}`,
	created_at_ns: updated,
	updated_at_ns: updated
});

describe('personal-notes.store', () => {
	beforeEach(() => {
		personalNotesStore.reset();
	});

	it('is unloaded and empty initially', () => {
		expect(get(personalNotesLoaded)).toBeFalsy();
		expect(get(personalNotesList)).toBeUndefined();
		expect(get(atPersonalNotesCapacity)).toBeFalsy();
	});

	it('setLoaded populates a newest-first list and marks loaded', () => {
		personalNotesStore.setLoaded({
			entries: [
				note({ id: 'a', updated: '100' }),
				note({ id: 'c', updated: '300' }),
				note({ id: 'b', updated: '200' })
			],
			count: 3
		});

		expect(get(personalNotesLoaded)).toBeTruthy();
		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['c', 'b', 'a']);
	});

	it('upsert adds and replaces by id', () => {
		personalNotesStore.setLoaded({ entries: [note({ id: 'a', updated: '100' })], count: 1 });
		personalNotesStore.upsert(note({ id: 'b', updated: '200' }));

		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['b', 'a']);

		personalNotesStore.upsert(note({ id: 'a', updated: '300' }));

		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['a', 'b']);
	});

	it('remove deletes by id', () => {
		personalNotesStore.setLoaded({
			entries: [note({ id: 'a', updated: '100' }), note({ id: 'b', updated: '200' })],
			count: 2
		});
		personalNotesStore.remove('a');

		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['b']);
	});

	it('atPersonalNotesCapacity reflects the count vs the cap', () => {
		personalNotesStore.setLoaded({ entries: [], count: MAX_PERSONAL_NOTES_PER_USER - 1 });

		expect(get(atPersonalNotesCapacity)).toBeFalsy();

		personalNotesStore.setCount(MAX_PERSONAL_NOTES_PER_USER);

		expect(get(atPersonalNotesCapacity)).toBeTruthy();
	});
});
