import NotesModal from '$lib/components/notes/NotesModal.svelte';
import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
import {
	NOTES_ADD_BUTTON,
	NOTES_DELETE_BUTTON,
	NOTES_INPUT,
	NOTES_LIST_ITEM,
	NOTES_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import * as notesServices from '$lib/services/personal-notes.services';
import { personalNotesStore, personalNotesUndoStore } from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

const note = (id: string): PersonalNoteUi => ({
	id,
	note: `note ${id}`,
	created_at_ns: '100',
	updated_at_ns: '100'
});

describe('NotesModal', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		mockAuthStore();
		personalNotesStore.reset();
		personalNotesUndoStore.set(undefined);
	});

	it('renders the empty state when there are no notes', () => {
		personalNotesStore.setLoaded({ entries: [], count: 0 });

		const { getByText, getByTestId } = render(NotesModal);

		expect(getByText(en.notes.text.empty_title)).toBeInTheDocument();
		expect(getByTestId(NOTES_ADD_BUTTON)).toBeInTheDocument();
	});

	it('renders the notes list', () => {
		personalNotesStore.setLoaded({ entries: [note('a'), note('b')], count: 2 });

		const { getAllByTestId } = render(NotesModal);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);
	});

	it('disables "Add note" at the per-user cap', () => {
		personalNotesStore.setLoaded({ entries: [note('a')], count: MAX_PERSONAL_NOTES_PER_USER });

		const { getByTestId } = render(NotesModal);

		expect(getByTestId(NOTES_ADD_BUTTON)).toBeDisabled();
	});

	it('saves a new note through the service', async () => {
		const saveSpy = vi.spyOn(notesServices, 'savePersonalNote').mockResolvedValue(note('new'));
		personalNotesStore.setLoaded({ entries: [], count: 0 });

		const { getByTestId } = render(NotesModal);

		await fireEvent.click(getByTestId(NOTES_ADD_BUTTON));
		await fireEvent.input(getByTestId(NOTES_INPUT), { target: { value: 'fresh note' } });
		await tick();
		await fireEvent.click(getByTestId(NOTES_SAVE_BUTTON));

		await waitFor(() =>
			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				id: undefined,
				note: 'fresh note'
			})
		);
	});

	it('deletes a note and keeps it for Undo', async () => {
		const deleteSpy = vi.spyOn(notesServices, 'deletePersonalNote').mockResolvedValue();
		personalNotesStore.setLoaded({ entries: [note('a')], count: 1 });

		const { getByTestId } = render(NotesModal);

		await fireEvent.click(getByTestId(NOTES_DELETE_BUTTON));

		await waitFor(() =>
			expect(deleteSpy).toHaveBeenCalledWith({ identity: mockIdentity, id: 'a' })
		);

		expect(get(personalNotesUndoStore)?.id).toBe('a');
	});
});
