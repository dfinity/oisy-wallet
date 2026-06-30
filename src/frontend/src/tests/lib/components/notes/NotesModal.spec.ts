import NotesModal from '$lib/components/notes/NotesModal.svelte';
import {
	NOTES_LIST_ITEM,
	NOTES_NO_RESULTS,
	NOTES_SEARCH_INPUT,
	NOTES_VIEW,
	NOTES_VIEW_DELETE_BUTTON,
	NOTES_VIEW_EDIT_BUTTON
} from '$lib/constants/test-ids.constants';
import { personalNotesStore } from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

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
	});

	it('renders the empty state when there are no notes', () => {
		personalNotesStore.setLoaded({ entries: [], count: 0 });

		const { getByText } = render(NotesModal);

		expect(getByText(en.notes.text.empty_title)).toBeInTheDocument();
	});

	it('renders the notes list', () => {
		personalNotesStore.setLoaded({ entries: [note('a'), note('b')], count: 2 });

		const { getAllByTestId } = render(NotesModal);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);
	});

	it('filters the list with the search field', async () => {
		personalNotesStore.setLoaded({ entries: [note('apple'), note('banana')], count: 2 });

		const { getByTestId, getAllByTestId, queryByTestId } = render(NotesModal);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);

		await fireEvent.input(getByTestId(NOTES_SEARCH_INPUT), { target: { value: 'apple' } });

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(1);

		await fireEvent.input(getByTestId(NOTES_SEARCH_INPUT), { target: { value: 'zzz' } });

		expect(queryByTestId(NOTES_LIST_ITEM)).toBeNull();
		expect(getByTestId(NOTES_NO_RESULTS)).toBeInTheDocument();
	});

	it('opens the read-only view on row click without edit/delete actions', async () => {
		personalNotesStore.setLoaded({ entries: [note('a')], count: 1 });

		const { getByTestId, getByText, queryByTestId } = render(NotesModal);

		await fireEvent.click(getByText('note a'));

		expect(getByTestId(NOTES_VIEW)).toBeInTheDocument();
		// The read path has no edit/delete yet; those actions arrive with the editor.
		expect(queryByTestId(NOTES_VIEW_EDIT_BUTTON)).toBeNull();
		expect(queryByTestId(NOTES_VIEW_DELETE_BUTTON)).toBeNull();
	});
});
