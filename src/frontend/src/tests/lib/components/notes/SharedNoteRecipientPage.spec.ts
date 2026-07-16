import { OISY_NOTES_DOCS_URL } from '$lib/constants/oisy.constants';
import {
	NOTES_SHARE_RECIPIENT_COPY,
	NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON,
	NOTES_SHARE_RECIPIENT_DONE_BUTTON,
	NOTES_SHARE_RECIPIENT_LOCKED,
	NOTES_SHARE_RECIPIENT_NOTE,
	NOTES_SHARE_RECIPIENT_OUTRO,
	NOTES_SHARE_RECIPIENT_REVEAL_BUTTON,
	NOTES_SHARE_RECIPIENT_REVEALED,
	NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT,
	NOTES_SHARE_RECIPIENT_UNAVAILABLE
} from '$lib/constants/test-ids.constants';
import * as shareServices from '$lib/services/personal-note-share.services';
import { trackPersonalNoteShare } from '$lib/services/personal-notes-analytics.services';
import SharePage from '$routes/(public)/notes/share/[token]/+page@.svelte';
import en from '$tests/mocks/i18n.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

// The hero Header pulls in the whole signed-in store graph; the recipient page
// only cares about its own state machine, so stub it out.
vi.mock('$lib/components/hero/Header.svelte', async () => await import('./HeaderStub.svelte'));

// The page reads the fragment key only in the browser.
vi.mock('$app/environment', () => ({ browser: true, dev: false, building: false }));

vi.mock('$lib/services/personal-notes-analytics.services', () => ({
	trackPersonalNoteShare: vi.fn()
}));

// Copying uses the clipboard API, which jsdom does not implement — stub the util
// so the copy step (and its analytics) runs deterministically.
vi.mock('$lib/utils/clipboard.utils', () => ({
	copyToClipboard: vi.fn().mockResolvedValue(undefined)
}));

describe('Share recipient page', () => {
	const setHash = (hash: string) => {
		window.location.hash = hash;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		mockPage.reset();
		mockPage.mockDynamicRoutes({ token: 'tok' });
		setHash('#k=KEY');
	});

	it('reveals a reusable note (locked → revealed → outro) and tracks the flow', async () => {
		const loadSpy = vi
			.spyOn(shareServices, 'loadSharedNote')
			.mockResolvedValue({ note: 'hello https://example.com', singleUse: false });

		const { getByTestId, queryByTestId, container, getByRole } = render(SharePage);

		// Locked by default — no backend call yet.
		expect(getByTestId(NOTES_SHARE_RECIPIENT_LOCKED)).toBeInTheDocument();
		expect(loadSpy).not.toHaveBeenCalled();
		expect(trackPersonalNoteShare).toHaveBeenCalledWith({ step: 'open', side: 'recipient' });

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_REVEALED)).toBeInTheDocument());

		// The revealed view's "Learn more" points at the notes docs page, not the docs root.
		expect(getByRole('link', { name: en.core.text.learn_more })).toHaveAttribute(
			'href',
			OISY_NOTES_DOCS_URL
		);

		// The fragment key and the route token are passed to the loader.
		expect(loadSpy).toHaveBeenCalledExactlyOnceWith({ token: 'tok', key: 'KEY' });
		expect(trackPersonalNoteShare).toHaveBeenCalledWith({
			step: 'reveal',
			side: 'recipient',
			singleUse: false
		});

		// The note renders with safe rendering (URL becomes a rel-guarded anchor).
		expect(container).toHaveTextContent('hello https://example.com');

		const anchor = container.querySelector('a[href="https://example.com"]');

		expect(anchor).not.toBeNull();
		expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');

		// Reusable: no single-use caveat.
		expect(queryByTestId(NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT)).toBeNull();

		// Copying the revealed note tracks the copy step.
		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_COPY));
		await waitFor(() =>
			expect(trackPersonalNoteShare).toHaveBeenCalledWith({ step: 'copy', side: 'recipient' })
		);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_DONE_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_OUTRO)).toBeInTheDocument());

		// Dismissing the revealed note tracks the close step.
		expect(trackPersonalNoteShare).toHaveBeenCalledWith({ step: 'close', side: 'recipient' });

		// The plaintext is cleared from the DOM on the outro.
		expect(queryByTestId(NOTES_SHARE_RECIPIENT_NOTE)).toBeNull();
		expect(container).not.toHaveTextContent('hello https://example.com');

		// The outro "Discover OISY" CTA tracks discover with its source.
		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON));

		expect(trackPersonalNoteShare).toHaveBeenCalledWith({
			step: 'discover',
			side: 'recipient',
			sourceDetail: 'outro'
		});
	});

	it('shows the single-use caveat for a single-use note', async () => {
		vi.spyOn(shareServices, 'loadSharedNote').mockResolvedValue({
			note: 'burn after reading',
			singleUse: true
		});

		const { getByTestId } = render(SharePage);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() =>
			expect(getByTestId(NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT)).toBeInTheDocument()
		);

		// A single-use reveal carries single_use: true.
		expect(trackPersonalNoteShare).toHaveBeenCalledWith({
			step: 'reveal',
			side: 'recipient',
			singleUse: true
		});
	});

	it('shows the unavailable state when the load fails, and tracks it', async () => {
		vi.spyOn(shareServices, 'loadSharedNote').mockRejectedValue(new Error('NotFound'));

		const { getByTestId } = render(SharePage);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_UNAVAILABLE)).toBeInTheDocument());

		expect(getByTestId(NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON)).toBeInTheDocument();
		expect(trackPersonalNoteShare).toHaveBeenCalledWith({ step: 'unavailable', side: 'recipient' });

		// The unavailable-state CTA tracks discover with its own source.
		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON));

		expect(trackPersonalNoteShare).toHaveBeenCalledWith({
			step: 'discover',
			side: 'recipient',
			sourceDetail: 'unavailable'
		});
	});

	it('fails closed without a backend call when the fragment key is missing', async () => {
		setHash('');
		const loadSpy = vi.spyOn(shareServices, 'loadSharedNote').mockResolvedValue({
			note: 'unused',
			singleUse: false
		});

		const { getByTestId } = render(SharePage);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_UNAVAILABLE)).toBeInTheDocument());

		// A missing key must never burn a single-use share.
		expect(loadSpy).not.toHaveBeenCalled();
	});
});
