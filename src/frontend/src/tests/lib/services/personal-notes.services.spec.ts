import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import {
	deletePersonalNote,
	loadPersonalNotes,
	restorePersonalNote,
	savePersonalNote
} from '$lib/services/personal-notes.services';
import * as vetkeys from '$lib/services/personal-notes.vetkeys';
import { personalNotesList, personalNotesStore } from '$lib/stores/personal-notes.store';
import { isPersonalNoteDecryptionFailure } from '$lib/types/personal-note';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

describe('personal-notes.services', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		personalNotesStore.reset();
	});

	describe('loadPersonalNotes', () => {
		it('decrypts notes and isolates a single decryption failure', async () => {
			vi.spyOn(backendApi, 'getPersonalNotes').mockResolvedValue([
				{ note_id: 'good', encrypted_note: new Uint8Array([1]) },
				{ note_id: 'bad', encrypted_note: new Uint8Array([2]) }
			]);
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(2n);
			vi.spyOn(vetkeys, 'decryptPersonalNote').mockImplementation(({ noteId }) =>
				noteId === 'bad'
					? Promise.reject(new Error('cannot decrypt'))
					: Promise.resolve({ note: 'hello', created_at_ns: '100', updated_at_ns: '100' })
			);

			await loadPersonalNotes(mockIdentity);

			const list = get(personalNotesList) ?? [];

			expect(list).toHaveLength(2);

			const bad = list.find(({ id }) => id === 'bad');
			const good = list.find(({ id }) => id === 'good');

			expect(bad !== undefined && isPersonalNoteDecryptionFailure(bad)).toBeTruthy();
			expect(good !== undefined && !isPersonalNoteDecryptionFailure(good)).toBeTruthy();
		});
	});

	describe('savePersonalNote', () => {
		it('encrypts, stores, and refreshes the count for a new note', async () => {
			const setSpy = vi.spyOn(backendApi, 'setPersonalNote').mockResolvedValue();
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(1n);
			vi.spyOn(vetkeys, 'encryptPersonalNote').mockResolvedValue(new Uint8Array([9]));

			const entry = await savePersonalNote({ identity: mockIdentity, note: 'fresh note' });

			expect(entry.note).toBe('fresh note');
			expect(entry.id).toHaveLength(32);
			expect(entry.created_at_ns).toBe(entry.updated_at_ns);
			expect(setSpy).toHaveBeenCalledOnce();

			const list = get(personalNotesList) ?? [];

			expect(list.map(({ id }) => id)).toEqual([entry.id]);
			expect(get(personalNotesStore).count).toBe(1);
		});

		it('reuses the id and created_at_ns when editing', async () => {
			personalNotesStore.setLoaded({
				entries: [{ id: 'note-1', note: 'old', created_at_ns: '100', updated_at_ns: '100' }],
				count: 1
			});
			vi.spyOn(backendApi, 'setPersonalNote').mockResolvedValue();
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(1n);
			vi.spyOn(vetkeys, 'encryptPersonalNote').mockResolvedValue(new Uint8Array([9]));

			const entry = await savePersonalNote({
				identity: mockIdentity,
				id: 'note-1',
				note: 'edited'
			});

			expect(entry.id).toBe('note-1');
			expect(entry.note).toBe('edited');
			expect(entry.created_at_ns).toBe('100');
			expect(BigInt(entry.updated_at_ns)).toBeGreaterThanOrEqual(100n);
		});
	});

	describe('deletePersonalNote', () => {
		it('removes the note from the store and refreshes the count', async () => {
			personalNotesStore.setLoaded({
				entries: [{ id: 'note-1', note: 'x', created_at_ns: '100', updated_at_ns: '100' }],
				count: 1
			});
			const deleteSpy = vi.spyOn(backendApi, 'deletePersonalNote').mockResolvedValue();
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(ZERO);

			await deletePersonalNote({ identity: mockIdentity, id: 'note-1' });

			expect(deleteSpy).toHaveBeenCalledWith({ identity: mockIdentity, note_id: 'note-1' });
			expect(get(personalNotesList)).toEqual([]);
			expect(get(personalNotesStore).count).toBe(0);
		});
	});

	describe('restorePersonalNote', () => {
		it('re-saves verbatim (same id and timestamps) and refreshes the count', async () => {
			const note = {
				id: 'note-1',
				note: 'restore me',
				created_at_ns: '100',
				updated_at_ns: '150'
			};
			const setSpy = vi.spyOn(backendApi, 'setPersonalNote').mockResolvedValue();
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(1n);
			const encryptSpy = vi
				.spyOn(vetkeys, 'encryptPersonalNote')
				.mockResolvedValue(new Uint8Array([9]));

			await restorePersonalNote({ identity: mockIdentity, note });

			expect(encryptSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				noteId: 'note-1',
				envelope: { note: 'restore me', created_at_ns: '100', updated_at_ns: '150' }
			});
			expect(setSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				note_id: 'note-1',
				encrypted_note: new Uint8Array([9])
			});
			expect(get(personalNotesList)).toEqual([note]);
			expect(get(personalNotesStore).count).toBe(1);
		});
	});
});
