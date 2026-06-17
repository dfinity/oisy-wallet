import NoteListItem from '$lib/components/notes/NoteListItem.svelte';
import {
	NOTES_DELETE_BUTTON,
	NOTES_EDIT_BUTTON,
	NOTES_LIST_ITEM,
	NOTES_RETRY_DECRYPT_BUTTON
} from '$lib/constants/test-ids.constants';
import type { PersonalNoteEntryUi } from '$lib/types/personal-note';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('NoteListItem', () => {
	const recentNs = (BigInt(Date.now()) * 1_000_000n).toString();

	const baseProps = () => ({
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		onRetry: vi.fn()
	});

	it('shows "Created" for a never-edited note and "Updated" for an edited one', () => {
		const created: PersonalNoteEntryUi = {
			id: 'a',
			note: 'hello',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};
		const { container, rerender } = render(NoteListItem, {
			props: { note: created, ...baseProps() }
		});

		expect(container).toHaveTextContent('Created');
		expect(container).not.toHaveTextContent('Updated');

		rerender({
			note: { ...created, updated_at_ns: (BigInt(recentNs) + 1n).toString() },
			...baseProps()
		});

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

		// No live elements were created from the note body — it is escaped text.
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

	it('calls onEdit / onDelete with the note id', async () => {
		const note: PersonalNoteEntryUi = {
			id: 'note-1',
			note: 'hello',
			created_at_ns: recentNs,
			updated_at_ns: recentNs
		};
		const props = { note, ...baseProps() };
		const { getByTestId } = render(NoteListItem, { props });

		await fireEvent.click(getByTestId(NOTES_EDIT_BUTTON));

		expect(props.onEdit).toHaveBeenCalledExactlyOnceWith('note-1');

		await fireEvent.click(getByTestId(NOTES_DELETE_BUTTON));

		expect(props.onDelete).toHaveBeenCalledExactlyOnceWith('note-1');
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
