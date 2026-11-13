import InputPersonalNote from '$lib/components/notes/InputPersonalNote.svelte';
import { MAX_PERSONAL_NOTE_LENGTH } from '$lib/constants/app.constants';
import { NOTES_INPUT } from '$lib/constants/test-ids.constants';
import { fireEvent, render } from '@testing-library/svelte';

describe('InputPersonalNote', () => {
	const tooLongPattern = /characters or fewer/;

	it('renders the textarea', () => {
		const { getByTestId } = render(InputPersonalNote, {
			props: { value: '', isValid: false }
		});

		expect(getByTestId(NOTES_INPUT)).toBeInTheDocument();
	});

	it('shows the too-long error past the cap', () => {
		const { getByText } = render(InputPersonalNote, {
			props: { value: 'a'.repeat(MAX_PERSONAL_NOTE_LENGTH + 1), isValid: false }
		});

		expect(getByText(tooLongPattern)).toBeInTheDocument();
	});

	it('accepts exactly the cap in code points', () => {
		const { queryByText } = render(InputPersonalNote, {
			props: { value: 'a'.repeat(MAX_PERSONAL_NOTE_LENGTH), isValid: false }
		});

		expect(queryByText(tooLongPattern)).not.toBeInTheDocument();
	});

	it('counts emoji as single code points, not UTF-16 units', () => {
		// MAX emoji = MAX code points (valid); UTF-16 length would be 2× and over-count.
		const { queryByText } = render(InputPersonalNote, {
			props: { value: '😀'.repeat(MAX_PERSONAL_NOTE_LENGTH), isValid: false }
		});

		expect(queryByText(tooLongPattern)).not.toBeInTheDocument();
	});

	it('calls onSubmit and prevents the default line break on Cmd+Enter', async () => {
		const onSubmit = vi.fn();
		const { getByTestId } = render(InputPersonalNote, {
			props: { value: 'hello', isValid: true, onSubmit }
		});

		const event = await fireEvent.keyDown(getByTestId(NOTES_INPUT), {
			key: 'Enter',
			metaKey: true
		});

		expect(onSubmit).toHaveBeenCalledOnce();
		// fireEvent's return value is `!defaultPrevented` (false once preventDefault ran).
		expect(event).toBeFalsy();
	});

	it('calls onSubmit on Ctrl+Enter', async () => {
		const onSubmit = vi.fn();
		const { getByTestId } = render(InputPersonalNote, {
			props: { value: 'hello', isValid: true, onSubmit }
		});

		await fireEvent.keyDown(getByTestId(NOTES_INPUT), { key: 'Enter', ctrlKey: true });

		expect(onSubmit).toHaveBeenCalledOnce();
	});

	it('does not call onSubmit on plain Enter', async () => {
		const onSubmit = vi.fn();
		const { getByTestId } = render(InputPersonalNote, {
			props: { value: 'hello', isValid: true, onSubmit }
		});

		const event = await fireEvent.keyDown(getByTestId(NOTES_INPUT), { key: 'Enter' });

		expect(onSubmit).not.toHaveBeenCalled();
		expect(event).toBeTruthy();
	});

	it('does not call onSubmit on Shift+Enter', async () => {
		const onSubmit = vi.fn();
		const { getByTestId } = render(InputPersonalNote, {
			props: { value: 'hello', isValid: true, onSubmit }
		});

		const event = await fireEvent.keyDown(getByTestId(NOTES_INPUT), {
			key: 'Enter',
			shiftKey: true
		});

		expect(onSubmit).not.toHaveBeenCalled();
		expect(event).toBeTruthy();
	});
});
