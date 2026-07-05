import NotesModal from '$lib/components/notes/NotesModal.svelte';
import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
import {
	NOTES_ADD_BUTTON,
	NOTES_DELETE_CONFIRM_BUTTON,
	NOTES_INPUT,
	NOTES_LIST_ITEM,
	NOTES_NO_RESULTS,
	NOTES_SAVE_BUTTON,
	NOTES_SEARCH_INPUT,
	NOTES_VIEW,
	NOTES_VIEW_DELETE_BUTTON,
	NOTES_VIEW_EDIT_BUTTON
} from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackPersonalNote } from '$lib/services/personal-notes-analytics.services';
import * as notesServices from '$lib/services/personal-notes.services';
import { personalNotesStore } from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity, mockPrincipalText } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

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
	trackPersonalNote: vi.fn()
}));

describe('NotesModal', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		mockAuthStore();
		personalNotesStore.reset();
	});

	it('tracks the notes surface opening on mount', () => {
		setLoadedNotes({ entries: [], count: 0 });

		render(NotesModal);

		expect(trackPersonalNote).toHaveBeenCalledExactlyOnceWith({
			step: 'open',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		});
	});

	it('renders the empty state when there are no notes', () => {
		setLoadedNotes({ entries: [], count: 0 });

		const { getByText, getByTestId } = render(NotesModal);

		expect(getByText(en.notes.text.empty_title)).toBeInTheDocument();
		expect(getByTestId(NOTES_ADD_BUTTON)).toBeInTheDocument();
	});

	it('renders the notes list', () => {
		setLoadedNotes({ entries: [note('a'), note('b')], count: 2 });

		const { getAllByTestId } = render(NotesModal);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);
	});

	it('disables "Add note" at the per-user cap', () => {
		setLoadedNotes({ entries: [note('a')], count: MAX_PERSONAL_NOTES_PER_USER });

		const { getByTestId } = render(NotesModal);

		expect(getByTestId(NOTES_ADD_BUTTON)).toBeDisabled();
	});

	it('saves a new note through the service', async () => {
		const saveSpy = vi.spyOn(notesServices, 'savePersonalNote').mockResolvedValue(note('new'));
		setLoadedNotes({ entries: [], count: 0 });

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

	it('filters the list with the search field', async () => {
		setLoadedNotes({ entries: [note('apple'), note('banana')], count: 2 });

		const { getByTestId, getAllByTestId, queryByTestId } = render(NotesModal);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);

		await fireEvent.input(getByTestId(NOTES_SEARCH_INPUT), { target: { value: 'apple' } });

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(1);

		await fireEvent.input(getByTestId(NOTES_SEARCH_INPUT), { target: { value: 'zzz' } });

		expect(queryByTestId(NOTES_LIST_ITEM)).toBeNull();
		expect(getByTestId(NOTES_NO_RESULTS)).toBeInTheDocument();
	});

	it('opens the read-only view on row click and reaches the editor via Edit', async () => {
		setLoadedNotes({ entries: [note('a')], count: 1 });

		const { getByTestId, getByText } = render(NotesModal);

		await fireEvent.click(getByText('note a'));

		expect(getByTestId(NOTES_VIEW)).toBeInTheDocument();

		await fireEvent.click(getByTestId(NOTES_VIEW_EDIT_BUTTON));

		expect(getByTestId(NOTES_INPUT)).toBeInTheDocument();
	});

	it('deletes a note only after the confirmation step', async () => {
		const deleteSpy = vi.spyOn(notesServices, 'deletePersonalNote').mockResolvedValue();
		setLoadedNotes({ entries: [note('a')], count: 1 });

		const { getByTestId, getByText } = render(NotesModal);

		// Open the note (row → view), where Delete lives, then request deletion.
		await fireEvent.click(getByText('note a'));
		await fireEvent.click(getByTestId(NOTES_VIEW_DELETE_BUTTON));

		// The confirmation is shown; nothing is deleted yet.
		expect(deleteSpy).not.toHaveBeenCalled();

		await fireEvent.click(getByTestId(NOTES_DELETE_CONFIRM_BUTTON));

		await waitFor(() =>
			expect(deleteSpy).toHaveBeenCalledWith({ identity: mockIdentity, id: 'a' })
		);
	});

	it('returns to the list when the viewed note disappears', async () => {
		setLoadedNotes({ entries: [note('a'), note('b')], count: 2 });

		const { getByTestId, getByText, queryByTestId } = render(NotesModal);

		await fireEvent.click(getByText('note a'));

		expect(getByTestId(NOTES_VIEW)).toBeInTheDocument();

		// The viewed note vanishes (e.g. decryption failure or removal on reload).
		personalNotesStore.setLoaded({
			ownerPrincipal: mockPrincipalText,
			entries: [note('b')],
			count: 1
		});

		await waitFor(() => {
			expect(queryByTestId(NOTES_VIEW)).toBeNull();
			expect(getByText('note b')).toBeInTheDocument();
		});
	});

	it('falls back to the empty state when the initial load fails', async () => {
		// No setLoaded → onMount runs the initial load, which rejects; the skeleton
		// must clear rather than stay stuck.
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.spyOn(console, 'debug').mockImplementation(() => {});
		vi.spyOn(notesServices, 'loadPersonalNotes').mockRejectedValue(new Error('load failed'));

		const { getByText } = render(NotesModal);

		await waitFor(() => {
			expect(getByText(en.notes.text.empty_title)).toBeInTheDocument();
		});

		expect(errorSpy).toHaveBeenCalled();
	});
});
