import ShareNoteContent from '$lib/components/notes/ShareNoteContent.svelte';
import { MAX_PERSONAL_NOTE_SHARES_PER_USER } from '$lib/constants/app.constants';
import { OISY_NOTES_DOCS_URL } from '$lib/constants/oisy.constants';
import {
	NOTES_SHARE_CAP_MESSAGE,
	NOTES_SHARE_CREATE_BUTTON,
	NOTES_SHARE_DONE_BUTTON,
	NOTES_SHARE_LINK_COPY
} from '$lib/constants/test-ids.constants';
import { PLAUSIBLE_EVENT_RESULT_STATUSES } from '$lib/enums/plausible';
import * as shareServices from '$lib/services/personal-note-share.services';
import { trackPersonalNoteShare } from '$lib/services/personal-notes-analytics.services';
import type { PersonalNoteUi } from '$lib/types/personal-note';
import * as shareUtils from '$lib/utils/share.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

vi.mock('$lib/services/personal-notes-analytics.services', () => ({
	trackPersonalNoteShare: vi.fn()
}));

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
		vi.clearAllMocks();
	});

	it('links "Learn more" to the notes docs page', () => {
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(0);

		const { getByRole } = render(ShareNoteContent, { props: baseProps() });

		// Points at the notes docs page, not the docs root.
		expect(getByRole('link', { name: en.core.text.learn_more })).toHaveAttribute(
			'href',
			OISY_NOTES_DOCS_URL
		);
	});

	it('creates a link and reveals it, tracking the non-personal attributes', async () => {
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(0);
		const createSpy = vi
			.spyOn(shareServices, 'createNoteShare')
			.mockResolvedValue({ link: 'https://oisy.com/notes/share/tok#k=KEY', token: 'tok' });

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

		expect(trackPersonalNoteShare).toHaveBeenCalledExactlyOnceWith({
			step: 'create',
			side: 'creator',
			resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.SUCCESS,
			singleUse: false,
			expiry: '24h'
		});
	});

	it('confirms a copied link inline, without a toast (visible over the bottom sheet)', async () => {
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(0);
		vi.spyOn(shareServices, 'createNoteShare').mockResolvedValue({
			link: 'https://oisy.com/notes/share/tok#k=KEY',
			token: 'tok'
		});
		const copySpy = vi.spyOn(shareUtils, 'copyText').mockResolvedValue();

		const { getByTestId, container } = render(ShareNoteContent, { props: baseProps() });

		await fireEvent.click(getByTestId(NOTES_SHARE_CREATE_BUTTON));
		await waitFor(() => expect(getByTestId(NOTES_SHARE_LINK_COPY)).toBeInTheDocument());

		// The confirmation is not shown before copying.
		expect(container).not.toHaveTextContent(en.notes.share.text.link_copied);

		await fireEvent.click(getByTestId(NOTES_SHARE_LINK_COPY));

		expect(copySpy).toHaveBeenCalledExactlyOnceWith('https://oisy.com/notes/share/tok#k=KEY');

		await waitFor(() => expect(container).toHaveTextContent(en.notes.share.text.link_copied));
	});

	it('tracks a create failure without leaking the note text', async () => {
		// A cap race (TooManyShares) is a create failure that reflects in the UI
		// without toasting — so it exercises error tracking with no console output.
		vi.spyOn(shareServices, 'getActiveShareCount').mockResolvedValue(0);
		vi.spyOn(shareServices, 'createNoteShare').mockRejectedValue({ TooManyShares: null });

		const { getByTestId } = render(ShareNoteContent, { props: baseProps() });

		await fireEvent.click(getByTestId(NOTES_SHARE_CREATE_BUTTON));

		await waitFor(() =>
			expect(trackPersonalNoteShare).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({
					step: 'create',
					side: 'creator',
					resultStatus: PLAUSIBLE_EVENT_RESULT_STATUSES.ERROR,
					singleUse: false,
					expiry: '24h',
					error: expect.stringContaining('TooManyShares')
				})
			)
		);

		// The share cap is reflected in the UI (button disabled) rather than toasted.
		expect(getByTestId(NOTES_SHARE_CREATE_BUTTON)).toBeDisabled();
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
