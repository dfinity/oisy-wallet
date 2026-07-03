import * as backendApi from '$lib/api/backend.api';
import { ZERO } from '$lib/constants/app.constants';
import {
	deletePersonalNote,
	loadPersonalNotes,
	savePersonalNote
} from '$lib/services/personal-notes.services';
import * as vetkeys from '$lib/services/personal-notes.vetkeys';
import { personalNotesList, personalNotesStore } from '$lib/stores/personal-notes.store';
import { isPersonalNoteDecryptionFailure } from '$lib/types/personal-note';
import {
	mockIdentity,
	mockPrincipal2,
	mockPrincipalText,
	mockPrincipalText2
} from '$tests/mocks/identity.mock';
import type { DerivedKeyMaterial } from '@dfinity/vetkeys';
import type { Identity } from '@icp-sdk/core/agent';
import { get } from 'svelte/store';

const mockIdentity2 = {
	getPrincipal: () => mockPrincipal2
} as unknown as Identity;

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
			vi.spyOn(vetkeys, 'deriveKeyMaterial').mockResolvedValue({} as DerivedKeyMaterial);
			vi.spyOn(vetkeys, 'decryptPersonalNoteWithKey').mockImplementation(({ noteId }) =>
				noteId === 'bad'
					? Promise.reject(new Error('cannot decrypt'))
					: Promise.resolve({ note: 'hello', created_at_ns: '100', updated_at_ns: '100' })
			);

			await loadPersonalNotes(mockIdentity);

			expect(get(personalNotesStore).ownerPrincipal).toBe(mockPrincipalText);

			const list = get(personalNotesList) ?? [];

			expect(list).toHaveLength(2);

			const bad = list.find(({ id }) => id === 'bad');
			const good = list.find(({ id }) => id === 'good');

			expect(bad !== undefined && isPersonalNoteDecryptionFailure(bad)).toBeTruthy();
			expect(good !== undefined && !isPersonalNoteDecryptionFailure(good)).toBeTruthy();
		});

		it('propagates a systemic derivation failure instead of a fully-failed list', async () => {
			vi.spyOn(backendApi, 'getPersonalNotes').mockResolvedValue([
				{ note_id: 'a', encrypted_note: new Uint8Array([1]) }
			]);
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(1n);
			vi.spyOn(vetkeys, 'deriveKeyMaterial').mockRejectedValue(new Error('vetKD down'));

			await expect(loadPersonalNotes(mockIdentity)).rejects.toThrow('vetKD down');
		});

		it('does not repopulate the store when an old load resolves after reset', async () => {
			let resolveEntries: (value: Awaited<ReturnType<typeof backendApi.getPersonalNotes>>) => void;

			vi.spyOn(backendApi, 'getPersonalNotes').mockReturnValue(
				new Promise((resolve) => {
					resolveEntries = resolve;
				})
			);
			vi.spyOn(backendApi, 'getPersonalNotesCount').mockResolvedValue(1n);
			vi.spyOn(vetkeys, 'deriveKeyMaterial').mockResolvedValue({} as DerivedKeyMaterial);
			vi.spyOn(vetkeys, 'decryptPersonalNoteWithKey').mockResolvedValue({
				note: 'stale',
				created_at_ns: '100',
				updated_at_ns: '100'
			});

			const loadPromise = loadPersonalNotes(mockIdentity);

			personalNotesStore.reset();
			resolveEntries!([{ note_id: 'stale', encrypted_note: new Uint8Array([1]) }]);

			await loadPromise;

			expect(get(personalNotesStore)).toEqual({
				ownerPrincipal: undefined,
				entries: undefined,
				count: 0,
				loaded: false
			});
		});
	});

	describe('savePersonalNote', () => {
		it('encrypts, stores, and refreshes the count for a new note', async () => {
			personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
			personalNotesStore.setLoaded({
				ownerPrincipal: mockPrincipalText,
				entries: [],
				count: 0
			});
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
			personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
			personalNotesStore.setLoaded({
				ownerPrincipal: mockPrincipalText,
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

		it('rejects a stale editor save before writing with a different identity', async () => {
			personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
			personalNotesStore.setLoaded({
				ownerPrincipal: mockPrincipalText,
				entries: [{ id: 'note-1', note: 'old', created_at_ns: '100', updated_at_ns: '100' }],
				count: 1
			});
			const setSpy = vi.spyOn(backendApi, 'setPersonalNote').mockResolvedValue();

			await expect(
				savePersonalNote({ identity: mockIdentity2, id: 'note-1', note: 'leaked note' })
			).rejects.toThrow('Personal notes cache does not belong to the current identity.');

			expect(get(personalNotesStore).ownerPrincipal).toBe(mockPrincipalText);
			expect(mockIdentity2.getPrincipal().toText()).toBe(mockPrincipalText2);
			expect(setSpy).not.toHaveBeenCalled();
		});
	});

	describe('deletePersonalNote', () => {
		it('removes the note from the store and refreshes the count', async () => {
			personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
			personalNotesStore.setLoaded({
				ownerPrincipal: mockPrincipalText,
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
});
