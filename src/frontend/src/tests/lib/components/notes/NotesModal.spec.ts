import NotesModal from '$lib/components/notes/NotesModal.svelte';
import {
	NOTES_BACK_BUTTON,
	NOTES_CANCEL_BUTTON,
	NOTES_DELETE_CONFIRM_BUTTON,
	NOTES_INPUT,
	NOTES_SAVE_BUTTON,
	NOTES_VIEW,
	NOTES_VIEW_DELETE_BUTTON,
	NOTES_VIEW_EDIT_BUTTON
} from '$lib/constants/test-ids.constants';
import * as notesServices from '$lib/services/personal-notes.services';
import { modalStore } from '$lib/stores/modal.store';
import { personalNotesStore } from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

const note = (id: string): PersonalNoteUi => ({
	id,
	note: `note ${id}`,
	created_at_ns: '100',
	updated_at_ns: '100'
});

const setLoadedNotes = ({ entries, count }: { entries: PersonalNoteUi[]; count: number }) => {
	personalNotesStore.beginLoad({ ownerPrincipal: mockPrincipalText });
	personalNotesStore.setLoaded({ ownerPrincipal: mockPrincipalText, entries, count });
};

vi.mock('$lib/services/personal-notes-analytics.services', () => ({
	trackPersonalNote: vi.fn(),
	trackPersonalNoteShare: vi.fn()
}));

describe('NotesModal', () => {
	// Opens the modal the way the Notes page does, so closing it is observable.
	const renderModal = (noteId?: string) => {
		modalStore.openNotes({ id: Symbol(), data: { noteId } });

		return render(NotesModal, { props: { noteId } });
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		mockAuthStore();
		personalNotesStore.reset();
		setLoadedNotes({ entries: [note('a'), note('b')], count: 2 });
	});

	it('opens on the read-only view of the given note', () => {
		const { getByTestId, getByText, queryByTestId } = renderModal('a');

		expect(getByTestId(NOTES_VIEW)).toBeInTheDocument();
		expect(getByText('note a')).toBeInTheDocument();
		expect(queryByTestId(NOTES_INPUT)).toBeNull();
	});

	it('returns to the page from the view', async () => {
		const { getByTestId } = renderModal('a');

		await fireEvent.click(getByTestId(NOTES_BACK_BUTTON));

		expect(get(modalStore)).toBeNull();
	});

	it('opens on the editor without a note, saves it as a new note and returns to the page', async () => {
		const saveSpy = vi.spyOn(notesServices, 'savePersonalNote').mockResolvedValue(note('new'));

		const { getByTestId, queryByTestId } = renderModal();

		expect(queryByTestId(NOTES_VIEW)).toBeNull();

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
		await waitFor(() => expect(get(modalStore)).toBeNull());
	});

	it('returns to the page when a new note is cancelled', async () => {
		const { getByTestId } = renderModal();

		await fireEvent.click(getByTestId(NOTES_CANCEL_BUTTON));

		expect(get(modalStore)).toBeNull();
	});

	it('reaches the editor via Edit and returns to the view on save', async () => {
		const saveSpy = vi.spyOn(notesServices, 'savePersonalNote').mockResolvedValue(note('a'));

		const { getByTestId } = renderModal('a');

		await fireEvent.click(getByTestId(NOTES_VIEW_EDIT_BUTTON));
		await fireEvent.input(getByTestId(NOTES_INPUT), { target: { value: 'note a, edited' } });
		await tick();
		await fireEvent.click(getByTestId(NOTES_SAVE_BUTTON));

		await waitFor(() =>
			expect(saveSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				id: 'a',
				note: 'note a, edited'
			})
		);
		await waitFor(() => expect(getByTestId(NOTES_VIEW)).toBeInTheDocument());

		expect(get(modalStore)).not.toBeNull();
	});

	it('returns to the view when an edit is cancelled', async () => {
		const { getByTestId } = renderModal('a');

		await fireEvent.click(getByTestId(NOTES_VIEW_EDIT_BUTTON));
		await fireEvent.click(getByTestId(NOTES_CANCEL_BUTTON));

		expect(getByTestId(NOTES_VIEW)).toBeInTheDocument();
		expect(get(modalStore)).not.toBeNull();
	});

	it('deletes a note only after the confirmation step, then returns to the page', async () => {
		const deleteSpy = vi.spyOn(notesServices, 'deletePersonalNote').mockResolvedValue();

		const { getByTestId } = renderModal('a');

		await fireEvent.click(getByTestId(NOTES_VIEW_DELETE_BUTTON));

		// The confirmation is shown; nothing is deleted yet.
		expect(deleteSpy).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId(NOTES_DELETE_CONFIRM_BUTTON));

		await waitFor(() =>
			expect(deleteSpy).toHaveBeenCalledWith({ identity: mockIdentity, id: 'a' })
		);
		await waitFor(() => expect(get(modalStore)).toBeNull());
	});

	it('returns to the page when the viewed note disappears', async () => {
		const { getByTestId } = renderModal('a');

		expect(getByTestId(NOTES_VIEW)).toBeInTheDocument();

		// The viewed note vanishes (e.g. decryption failure or removal on reload).
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [note('b')],
			count: 1
		});

		await waitFor(() => expect(get(modalStore)).toBeNull());
	});
});
