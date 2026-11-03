import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
import {
	NOTES_LIST_ITEM,
	NOTES_LIST_ITEM_DELETE_BUTTON,
	NOTES_RETRY_DECRYPT_BUTTON
} from '$lib/constants/test-ids.constants';
import type { PersonalNoteEntryUi } from '$lib/types/personal-note';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('NoteListItem', () => {
	const recentNs = (BigInt(Date.now()) * 1_000_000n).toString();

	const baseProps = () => ({ onSelect: vi.fn(), onDelete: vi.fn(), onRetry: vi.fn() });

	it('shows the first line as the title and the rest as the body', () => {
		const note: PersonalNoteEntryUi = {
			id: 'a',
			note: 'This is a title\nAnd here\nthe content',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};

		const { container } = render(NoteListItem, { props: { note, ...baseProps() } });

		expect(container).toHaveTextContent('This is a title');
		expect(container).toHaveTextContent('And here the content');
		expect(container).toHaveTextContent('Created');
	});

	it('previews up to two lines of the body, with the timestamp on its own line below', () => {
		const note: PersonalNoteEntryUi = {
			id: 'a',
			note: 'Title\nA body long enough to wrap onto a second line in the list',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};

		const { getByText } = render(NoteListItem, { props: { note, ...baseProps() } });

		const body = getByText('A body long enough to wrap onto a second line in the list');
		const timestamp = getByText(/^Created/);

		expect(body).toHaveClass('line-clamp-2');
		expect(body.contains(timestamp)).toBeFalsy();
		expect(body.compareDocumentPosition(timestamp) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});

	it('darkens while pressed instead of shrinking, like other full-width rows', () => {
		const note: PersonalNoteEntryUi = {
			id: 'a',
			note: 'Title',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};

		const { getByTestId } = render(NoteListItem, { props: { note, ...baseProps() } });

		expect(getByTestId(NOTES_LIST_ITEM)).toHaveClass('row-feedback');
	});

	it('shows "Updated" once the note has been edited', () => {
		const note: PersonalNoteEntryUi = {
			id: 'a',
			note: 'hello',
			created_at_ns: recentNs,
			updated_at_ns: (BigInt(recentNs) + 1n).toString()
		};

		const { container } = render(NoteListItem, { props: { note, ...baseProps() } });

		expect(container).toHaveTextContent('Updated');
	});

	it('renders HTML/script-like content inertly as plain text', () => {
		const note: PersonalNoteEntryUi = {
			id: 'a',
			note: '<img src=x onerror=alert(1)><script>bad()</script>',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};

		const { container } = render(NoteListItem, { props: { note, ...baseProps() } });

		expect(container.querySelector('img')).toBeNull();
		expect(container.querySelector('script')).toBeNull();
		expect(container).toHaveTextContent('onerror=alert(1)');
	});

	it('neutralizes bidi-override characters in the preview', () => {
		const note: PersonalNoteEntryUi = {
			id: 'a',
			note: '\u202Ereversed',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};

		const { getByTestId } = render(NoteListItem, { props: { note, ...baseProps() } });

		expect(getByTestId(NOTES_LIST_ITEM).textContent).not.toContain('\u202E');
	});

	it('calls onSelect with the note id when the row is clicked', async () => {
		const note: PersonalNoteEntryUi = {
			id: 'note-1',
			note: 'hello',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};
		const props = { note, ...baseProps() };
		const { getByTestId } = render(NoteListItem, { props });

		await fireEvent.click(getByTestId(NOTES_LIST_ITEM));

		expect(props.onSelect).toHaveBeenCalledExactlyOnceWith('note-1');
		expect(props.onDelete).not.toHaveBeenCalled();
	});

	it('calls onDelete with the note id from its delete button, without opening the note', async () => {
		const note: PersonalNoteEntryUi = {
			id: 'note-1',
			note: 'hello',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};
		const props = { note, ...baseProps() };
		const { getByTestId } = render(NoteListItem, { props });

		const deleteButton = getByTestId(NOTES_LIST_ITEM_DELETE_BUTTON);

		expect(deleteButton).toHaveAccessibleName(en.notes.text.delete_note);
		// A sibling of the row button, never nested in it.
		expect(getByTestId(NOTES_LIST_ITEM).contains(deleteButton)).toBeFalsy();

		await fireEvent.click(deleteButton);

		expect(props.onDelete).toHaveBeenCalledExactlyOnceWith('note-1');
		expect(props.onSelect).not.toHaveBeenCalled();
	});

	it('shows an error + Retry for a note that failed to decrypt', async () => {
		const note: PersonalNoteEntryUi = { id: 'broken', decryptionFailed: true };
		const props = { note, ...baseProps() };
		const { getByTestId, getByText, queryByTestId } = render(NoteListItem, { props });

		expect(getByText(en.notes.text.decryption_failed)).toBeInTheDocument();
		// Its delete confirmation would have no text to name the note by.
		expect(queryByTestId(NOTES_LIST_ITEM_DELETE_BUTTON)).toBeNull();

		await fireEvent.click(getByTestId(NOTES_RETRY_DECRYPT_BUTTON));

		expect(props.onRetry).toHaveBeenCalledOnce();
	});
});
