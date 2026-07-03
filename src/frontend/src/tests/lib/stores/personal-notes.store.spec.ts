import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
import {
	atPersonalNotesCapacity,
	personalNotesList,
	personalNotesLoaded,
	personalNotesStore
} from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockPrincipalText, mockPrincipalText2 } from '$tests/mocks/identity.mock';
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
		personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });

		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
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
		personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [note({ id: 'a', updated: '100' })],
			count: 1
		});
		personalNotesStore.upsert({
			ownerPrincipal: mockPrincipalText,
			entry: note({ id: 'b', updated: '200' })
		});

		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['b', 'a']);

		personalNotesStore.upsert({
			ownerPrincipal: mockPrincipalText,
			entry: note({ id: 'a', updated: '300' })
		});

		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['a', 'b']);
	});

	it('remove deletes by id', () => {
		personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [note({ id: 'a', updated: '100' }), note({ id: 'b', updated: '200' })],
			count: 2
		});
		personalNotesStore.remove({ ownerPrincipal: mockPrincipalText, id: 'a' });

		expect(get(personalNotesList)?.map(({ id }) => id)).toEqual(['b']);
	});

	it('atPersonalNotesCapacity reflects the count vs the cap', () => {
		personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [],
			count: MAX_PERSONAL_NOTES_PER_USER - 1
		});

		expect(get(atPersonalNotesCapacity)).toBeFalsy();

		personalNotesStore.setCount({
			ownerPrincipal: mockPrincipalText,
			count: MAX_PERSONAL_NOTES_PER_USER
		});

		expect(get(atPersonalNotesCapacity)).toBeTruthy();
	});

	it('ignores stale writes after the owner changes', () => {
		personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [note({ id: 'a', updated: '100' })],
			count: 1
		});

		personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText2 });
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [note({ id: 'old', updated: '300' })],
			count: 1
		});
		personalNotesStore.upsert({
			ownerPrincipal: mockPrincipalText,
			entry: note({ id: 'old', updated: '300' })
		});
		personalNotesStore.setCount({ ownerPrincipal: mockPrincipalText, count: MAX_PERSONAL_NOTES_PER_USER });

		expect(get(personalNotesStore)).toEqual({
			ownerPrincipal: mockPrincipalText2,
			entries: undefined,
			count: 0,
			loaded: false
		});
	});
});
