import { PersonalNotesRateLimitedError } from '$lib/canisters/errors';
import Notes from '$lib/components/notes/Notes.svelte';
import { MAX_PERSONAL_NOTES_PER_USER } from '$lib/constants/app.constants';
import {
	NOTES_ADD_BUTTON,
	NOTES_LIST_ITEM,
	NOTES_NO_RESULTS,
	NOTES_SEARCH_INPUT,
	NOTES_UNAVAILABLE,
	NOTES_UNAVAILABLE_RETRY_BUTTON,
	NOTES_UNLOCKING
} from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import { trackPersonalNote } from '$lib/services/personal-notes-analytics.services';
import * as notesServices from '$lib/services/personal-notes.services';
import { modalStore } from '$lib/stores/modal.store';
import { personalNotesStore } from '$lib/stores/personal-notes.store';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
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

describe('Notes', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		mockAuthStore();
		personalNotesStore.reset();
		modalStore.close();
	});

	it('tracks the notes surface opening on mount', () => {
		setLoadedNotes({ entries: [], count: 0 });

		render(Notes);

		expect(trackPersonalNote).toHaveBeenCalledExactlyOnceWith({
			step: 'open',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		});
	});

	it('renders the empty state when there are no notes', () => {
		setLoadedNotes({ entries: [], count: 0 });

		const { getByText, getByTestId } = render(Notes);

		expect(getByText(en.notes.text.empty_title)).toBeInTheDocument();
		expect(getByTestId(NOTES_ADD_BUTTON)).toBeInTheDocument();
	});

	it('opens the note modal on its editor from the empty state', async () => {
		setLoadedNotes({ entries: [], count: 0 });

		const { getByTestId } = render(Notes);

		await fireEvent.click(getByTestId(NOTES_ADD_BUTTON));

		expect(get(modalStore)).toEqual({ type: 'notes', id: expect.any(Symbol) });
	});

	it('renders the notes list', () => {
		setLoadedNotes({ entries: [note('a'), note('b')], count: 2 });

		const { getAllByTestId } = render(Notes);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);
	});

	it('opens the note modal on its editor from "Add note"', async () => {
		setLoadedNotes({ entries: [note('a')], count: 1 });

		const { getByTestId } = render(Notes);

		await fireEvent.click(getByTestId(NOTES_ADD_BUTTON));

		expect(get(modalStore)).toEqual({ type: 'notes', id: expect.any(Symbol) });
	});

	it('opens a note in the modal on row click and tracks its preview', async () => {
		setLoadedNotes({ entries: [note('a')], count: 1 });

		const { getByText } = render(Notes);

		await fireEvent.click(getByText('note a'));

		expect(get(modalStore)).toEqual({
			type: 'notes',
			id: expect.any(Symbol),
			data: { noteId: 'a' }
		});
		expect(trackPersonalNote).toHaveBeenCalledWith({
			step: 'view',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS
		});
	});

	it('shows the unavailable panel with the rate-limited message when the load is rate-limited', async () => {
		vi.spyOn(notesServices, 'loadPersonalNotes').mockRejectedValue(
			new PersonalNotesRateLimitedError('rate limited')
		);

		const { getByTestId } = render(Notes);

		await waitFor(() => expect(getByTestId(NOTES_UNAVAILABLE)).toBeInTheDocument());

		expect(getByTestId(NOTES_UNAVAILABLE)).toHaveTextContent(en.notes.error.rate_limited);
	});

	it('shows the generic unavailable message on a non-rate-limit failure and retries on click', async () => {
		const loadSpy = vi
			.spyOn(notesServices, 'loadPersonalNotes')
			.mockRejectedValue(new Error('boom'));

		const { getByTestId } = render(Notes);

		await waitFor(() => expect(getByTestId(NOTES_UNAVAILABLE)).toBeInTheDocument());

		expect(getByTestId(NOTES_UNAVAILABLE)).toHaveTextContent(en.notes.error.load);

		loadSpy.mockClear();
		await fireEvent.click(getByTestId(NOTES_UNAVAILABLE_RETRY_BUTTON));

		expect(loadSpy).toHaveBeenCalled();
	});

	it('disables "Add note" at the per-user cap', () => {
		setLoadedNotes({ entries: [note('a')], count: MAX_PERSONAL_NOTES_PER_USER });

		const { getByTestId } = render(Notes);

		expect(getByTestId(NOTES_ADD_BUTTON)).toBeDisabled();
	});

	it('filters the list with the search field', async () => {
		setLoadedNotes({ entries: [note('apple'), note('banana')], count: 2 });

		const { getByTestId, getAllByTestId, queryByTestId } = render(Notes);

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(2);

		await fireEvent.input(getByTestId(NOTES_SEARCH_INPUT), { target: { value: 'apple' } });

		expect(getAllByTestId(NOTES_LIST_ITEM)).toHaveLength(1);

		await fireEvent.input(getByTestId(NOTES_SEARCH_INPUT), { target: { value: 'zzz' } });

		expect(queryByTestId(NOTES_LIST_ITEM)).toBeNull();
		expect(getByTestId(NOTES_NO_RESULTS)).toBeInTheDocument();
	});

	it('shows the unavailable panel, not the empty state, when the initial load fails', async () => {
		// No setLoaded → onMount runs the initial load, which rejects; the skeleton
		// must clear to the unavailable panel rather than fall through to empty.
		vi.spyOn(notesServices, 'loadPersonalNotes').mockRejectedValue(new Error('load failed'));

		const { getByTestId, queryByText } = render(Notes);

		await waitFor(() => expect(getByTestId(NOTES_UNAVAILABLE)).toBeInTheDocument());

		expect(queryByText(en.notes.text.empty_title)).toBeNull();
	});

	it('shows the unlocking screen while the vetKey is being derived', async () => {
		vi.spyOn(notesServices, 'loadPersonalNotes').mockImplementation(async ({ onDeriveStart }) => {
			// Enter the derivation phase, then stay pending so it stays observable.
			onDeriveStart?.();
			await new Promise(() => {});
		});

		const { getByTestId } = render(Notes);

		await waitFor(() => expect(getByTestId(NOTES_UNLOCKING)).toBeInTheDocument());
	});

	it('shows the skeleton, not the unlocking screen, during the initial fetch', async () => {
		// Load in progress but derivation has not started (onDeriveStart not called).
		vi.spyOn(notesServices, 'loadPersonalNotes').mockImplementation(() => new Promise(() => {}));

		const { queryByTestId, queryByText } = render(Notes);

		await tick();

		expect(queryByTestId(NOTES_UNLOCKING)).toBeNull();
		// Still loading: neither the empty state nor a list yet.
		expect(queryByText(en.notes.text.empty_title)).toBeNull();
	});

	it('never shows the unlocking screen for an empty load (no derivation)', async () => {
		vi.spyOn(notesServices, 'loadPersonalNotes').mockImplementation(() => {
			setLoadedNotes({ entries: [], count: 0 });
			return Promise.resolve();
		});

		const { getByText, queryByTestId } = render(Notes);

		await waitFor(() => expect(getByText(en.notes.text.empty_title)).toBeInTheDocument());

		expect(queryByTestId(NOTES_UNLOCKING)).toBeNull();
	});
});
