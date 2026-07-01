import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
import { NOTES_LIST_ITEM, NOTES_RETRY_DECRYPT_BUTTON } from '$lib/constants/test-ids.constants';
import type { PersonalNoteEntryUi } from '$lib/types/personal-note';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('NoteListItem', () => {
	const recentNs = (BigInt(Date.now()) * 1_000_000n).toString();

	const baseProps = () => ({ onSelect: vi.fn(), onRetry: vi.fn() });

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
		const { getByRole } = render(NoteListItem, { props });

		await fireEvent.click(getByRole('button'));

		expect(props.onSelect).toHaveBeenCalledExactlyOnceWith('note-1');
	});

	it('shows an error + Retry for a note that failed to decrypt', async () => {
		const note: PersonalNoteEntryUi = { id: 'broken', decryptionFailed: true };
		const props = { note, ...baseProps() };
		const { getByTestId, getByText } = render(NoteListItem, { props });

		expect(getByText(en.notes.text.decryption_failed)).toBeInTheDocument();

		await fireEvent.click(getByTestId(NOTES_RETRY_DECRYPT_BUTTON));

		expect(props.onRetry).toHaveBeenCalledOnce();
	});
});
