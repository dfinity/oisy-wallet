import SharedNoteRevealed from '$lib/components/notes/SharedNoteRevealed.svelte';
import { NOTES_SHARE_RECIPIENT_COPY } from '$lib/constants/test-ids.constants';
import { trackPersonalNoteShare } from '$lib/services/personal-notes-analytics.services';
import * as clipboardUtils from '$lib/utils/clipboard.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/personal-notes-analytics.services', () => ({
	trackPersonalNoteShare: vi.fn()
}));

describe('SharedNoteRevealed', () => {
	const props = {
		note: 'hello',
		singleUse: false,
		onDone: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should track the copy step after a successful copy', async () => {
		const spyCopy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(true);

		const { getByTestId } = render(SharedNoteRevealed, { props });

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_COPY));

		expect(spyCopy).toHaveBeenCalledExactlyOnceWith({
			value: props.note,
			text: en.notes.share.recipient.note_copied
		});

		await waitFor(() =>
			expect(trackPersonalNoteShare).toHaveBeenCalledExactlyOnceWith({
				step: 'copy',
				side: 'recipient'
			})
		);
	});

	it('should not track the copy step when the copy fails', async () => {
		const spyCopy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(false);

		const { getByTestId } = render(SharedNoteRevealed, { props });

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_COPY));

		await waitFor(() => expect(spyCopy).toHaveBeenCalledOnce());
		// Let the awaited copy settle before asserting the absence.
		await Promise.resolve();

		expect(trackPersonalNoteShare).not.toHaveBeenCalled();
	});
});
