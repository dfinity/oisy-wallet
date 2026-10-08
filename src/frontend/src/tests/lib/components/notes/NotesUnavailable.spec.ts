import NotesUnavailable from '$lib/components/notes/NotesUnavailable.svelte';
import {
	NOTES_UNAVAILABLE,
	NOTES_UNAVAILABLE_RETRY_BUTTON
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('NotesUnavailable', () => {
	it('shows the rate-limited message when rate limited', () => {
		const { getByTestId } = render(NotesUnavailable, {
			props: { rateLimited: true, onRetry: vi.fn() }
		});

		const panel = getByTestId(NOTES_UNAVAILABLE);

		expect(panel).toHaveTextContent(en.notes.text.unavailable_title);
		expect(panel).toHaveTextContent(en.notes.error.rate_limited);
	});

	it('falls back to the generic load message when not rate limited', () => {
		const { getByTestId } = render(NotesUnavailable, {
			props: { rateLimited: false, onRetry: vi.fn() }
		});

		const panel = getByTestId(NOTES_UNAVAILABLE);

		expect(panel).toHaveTextContent(en.notes.text.unavailable_title);
		expect(panel).toHaveTextContent(en.notes.error.load);
	});

	it('calls onRetry when the Retry button is clicked', async () => {
		const onRetry = vi.fn();
		const { getByTestId } = render(NotesUnavailable, { props: { rateLimited: true, onRetry } });

		await fireEvent.click(getByTestId(NOTES_UNAVAILABLE_RETRY_BUTTON));

		expect(onRetry).toHaveBeenCalledOnce();
	});
});
