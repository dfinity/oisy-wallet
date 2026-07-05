import ShareNoteContent from '$lib/components/notes/ShareNoteContent.svelte';
import { TRACK_NOTE_SHARE_CREATED } from '$lib/constants/analytics.constants';
import { MAX_PERSONAL_NOTE_SHARES_PER_USER } from '$lib/constants/app.constants';
import {
	NOTES_SHARE_CAP_MESSAGE,
	NOTES_SHARE_CREATE_BUTTON,
	NOTES_SHARE_DONE_BUTTON
} from '$lib/constants/test-ids.constants';
import * as analyticsServices from '$lib/services/analytics.services';
import * as shareServices from '$lib/services/personal-note-share.services';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('ShareNoteContent', () => {
	const note: PersonalNoteUi = {
		id: 'note-1',
		note: 'my secret note',
		created_at_ns: '100',
		updated_at_ns: '100'
	};

	const baseProps = () => ({ note, identity: mockIdentity, onClose: vi.fn() });

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('creates a link and reveals it, tracking the non-personal attributes', async () => {
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(0);
		const createSpy = vi
			.spyOn(shareServices, 'createNoteShare')
			.mockResolvedValue({ link: 'https://oisy.com/notes/share/tok#k=KEY', token: 'tok' });
		const trackSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		const { getByTestId, queryByTestId, container } = render(ShareNoteContent, {
			props: baseProps()
		});

		await fireEvent.click(getByTestId(NOTES_SHARE_CREATE_BUTTON));

		// State B — link ready.
		await waitFor(() => expect(getByTestId(NOTES_SHARE_DONE_BUTTON)).toBeInTheDocument());

		expect(container).toHaveTextContent('https://oisy.com/notes/share/tok#k=KEY');
		expect(queryByTestId(NOTES_SHARE_CREATE_BUTTON)).toBeNull();

		// The default 24h / reusable configuration is passed through.
		expect(createSpy).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			note: 'my secret note',
			durationMs: 24 * 60 * 60 * 1000,
			singleUse: false
		});

		expect(trackSpy).toHaveBeenCalledExactlyOnceWith({
			name: TRACK_NOTE_SHARE_CREATED,
			metadata: { expiry: '24h', singleUse: 'false' }
		});
	});

	it('disables creation and shows the cap message at the active-share cap', async () => {
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(
			MAX_PERSONAL_NOTE_SHARES_PER_USER
		);
		const createSpy = vi
			.spyOn(shareServices, 'createNoteShare')
			.mockResolvedValue({ link: 'unused', token: 'unused' });

		const { getByTestId } = render(ShareNoteContent, { props: baseProps() });

		await waitFor(() => expect(getByTestId(NOTES_SHARE_CAP_MESSAGE)).toBeInTheDocument());

		expect(getByTestId(NOTES_SHARE_CREATE_BUTTON)).toBeDisabled();

		// Defence in depth: even if the click reaches the handler, the at-cap guard
		// keeps it from creating a share.
		await fireEvent.click(getByTestId(NOTES_SHARE_CREATE_BUTTON));

		expect(createSpy).not.toHaveBeenCalled();
	});

	it('has no free-text sender-name field', async () => {
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(0);

		const { container } = render(ShareNoteContent, { props: baseProps() });

		await waitFor(() => expect(container.querySelector('input[type="text"]')).toBeNull());
	});
});
