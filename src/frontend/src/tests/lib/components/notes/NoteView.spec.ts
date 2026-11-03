import NoteView from '$lib/components/notes/NoteView.svelte';
import {
	NOTES_VIEW_CLOSE_BUTTON,
	NOTES_VIEW_DELETE_BUTTON,
	NOTES_VIEW_EDIT_BUTTON
} from '$lib/constants/test-ids.constants';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('NoteView', () => {
	const note: PersonalNoteUi = {
		id: 'note-1',
		note: 'This is a title\nbody with https://oisy.com link',
		created_at_ns: '100',
		updated_at_ns: '100'
	};

	const baseProps = () => ({ onClose: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() });

	it('renders the title and body and turns an http(s) URL into a safe new-tab link', () => {
		const { container } = render(NoteView, {
			props: { note, ...baseProps() }
		});

		expect(container).toHaveTextContent('This is a title');
		expect(container).toHaveTextContent('body with');

		const link = container.querySelector('a[href="https://oisy.com"]');

		expect(link).not.toBeNull();
		expect(link?.getAttribute('target')).toBe('_blank');
		expect(link?.getAttribute('rel')).toContain('noopener');
	});

	it('uses the first non-empty line as the title when the note starts with blank lines', () => {
		const { container } = render(NoteView, {
			props: { note: { ...note, note: '\n\nTitle\nBody' }, ...baseProps() }
		});

		const title = container.querySelector('p.font-bold');
		const body = container.querySelector('p.whitespace-pre-wrap');

		expect(title?.textContent?.trim()).toBe('Title');
		expect(body?.textContent?.trim()).toBe('Body');
	});

	it('does not linkify dangerous schemes', () => {
		const { container } = render(NoteView, {
			props: {
				note: { ...note, note: 'click javascript:alert(1)' },
				...baseProps()
			}
		});

		expect(container.querySelector('a')).toBeNull();
	});

	it('always labels the footer "Close"', () => {
		const { getByTestId } = render(NoteView, {
			props: { note, ...baseProps() }
		});

		expect(getByTestId(NOTES_VIEW_CLOSE_BUTTON)).toHaveTextContent(en.core.text.close);
	});

	it('calls the edit / delete / close callbacks', async () => {
		const props = { note, ...baseProps() };
		const { getByTestId } = render(NoteView, { props });

		await fireEvent.click(getByTestId(NOTES_VIEW_EDIT_BUTTON));

		expect(props.onEdit).toHaveBeenCalledOnce();

		await fireEvent.click(getByTestId(NOTES_VIEW_DELETE_BUTTON));

		expect(props.onDelete).toHaveBeenCalledExactlyOnceWith('note-1');

		await fireEvent.click(getByTestId(NOTES_VIEW_CLOSE_BUTTON));

		expect(props.onClose).toHaveBeenCalledOnce();
	});
});
