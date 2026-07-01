import {
	TRACK_NOTE_SHARE_RECIPIENT_REVEALED,
	TRACK_NOTE_SHARE_RECIPIENT_UNAVAILABLE,
	TRACK_NOTE_SHARE_RECIPIENT_VIEW
} from '$lib/constants/analytics.constants';
import {
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
import * as analyticsServices from '$lib/services/analytics.services';
import * as shareServices from '$lib/services/personal-note-share.services';
import SharePage from '$routes/(public)/notes/share/[token]/+page@.svelte';
import { mockPage } from '$tests/mocks/page.store.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

// The hero Header pulls in the whole signed-in store graph; the recipient page
// only cares about its own state machine, so stub it out.
vi.mock('$lib/components/hero/Header.svelte', async () => await import('./HeaderStub.svelte'));

// The page reads the fragment key only in the browser.
vi.mock('$app/environment', () => ({ browser: true, dev: false, building: false }));

describe('Share recipient page', () => {
	const setHash = (hash: string) => {
		window.location.hash = hash;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		mockPage.reset();
		mockPage.mockDynamicRoutes({ token: 'tok' });
		setHash('#k=KEY');
	});

	it('reveals a reusable note (locked → revealed → outro) and tracks the flow', async () => {
		const loadSpy = vi
			.spyOn(shareServices, 'loadSharedNote')
			.mockResolvedValue({ note: 'hello https://example.com', singleUse: false });
		const trackSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		const { getByTestId, queryByTestId, container } = render(SharePage);

		// Locked by default — no backend call yet.
		expect(getByTestId(NOTES_SHARE_RECIPIENT_LOCKED)).toBeInTheDocument();
		expect(loadSpy).not.toHaveBeenCalled();
		expect(trackSpy).toHaveBeenCalledWith({ name: TRACK_NOTE_SHARE_RECIPIENT_VIEW });

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_REVEALED)).toBeInTheDocument());

		// The fragment key and the route token are passed to the loader.
		expect(loadSpy).toHaveBeenCalledExactlyOnceWith({ token: 'tok', key: 'KEY' });
		expect(trackSpy).toHaveBeenCalledWith({
			name: TRACK_NOTE_SHARE_RECIPIENT_REVEALED,
			metadata: { single_use: 'false' }
		});

		// The note renders with safe rendering (URL becomes a rel-guarded anchor).
		expect(container).toHaveTextContent('hello https://example.com');

		const anchor = container.querySelector('a[href="https://example.com"]');

		expect(anchor).not.toBeNull();
		expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');

		// Reusable: no single-use caveat.
		expect(queryByTestId(NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT)).toBeNull();

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_DONE_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_OUTRO)).toBeInTheDocument());

		// The plaintext is cleared from the DOM on the outro.
		expect(queryByTestId(NOTES_SHARE_RECIPIENT_NOTE)).toBeNull();
		expect(container).not.toHaveTextContent('hello https://example.com');
	});

	it('shows the single-use caveat for a single-use note', async () => {
		vi.spyOn(shareServices, 'loadSharedNote').mockResolvedValue({
			note: 'burn after reading',
			singleUse: true
		});
		vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		const { getByTestId } = render(SharePage);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() =>
			expect(getByTestId(NOTES_SHARE_RECIPIENT_SINGLE_USE_CAVEAT)).toBeInTheDocument()
		);
	});

	it('shows the unavailable state when the load fails, and tracks it', async () => {
		vi.spyOn(shareServices, 'loadSharedNote').mockRejectedValue(new Error('NotFound'));
		const trackSpy = vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		const { getByTestId } = render(SharePage);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_UNAVAILABLE)).toBeInTheDocument());

		expect(getByTestId(NOTES_SHARE_RECIPIENT_DISCOVER_BUTTON)).toBeInTheDocument();
		expect(trackSpy).toHaveBeenCalledWith({ name: TRACK_NOTE_SHARE_RECIPIENT_UNAVAILABLE });
	});

	it('fails closed without a backend call when the fragment key is missing', async () => {
		setHash('');
		const loadSpy = vi.spyOn(shareServices, 'loadSharedNote').mockResolvedValue({
			note: 'unused',
			singleUse: false
		});
		vi.spyOn(analyticsServices, 'trackEvent').mockImplementation(() => {});

		const { getByTestId } = render(SharePage);

		await fireEvent.click(getByTestId(NOTES_SHARE_RECIPIENT_REVEAL_BUTTON));

		await waitFor(() => expect(getByTestId(NOTES_SHARE_RECIPIENT_UNAVAILABLE)).toBeInTheDocument());

		// A missing key must never burn a single-use share.
		expect(loadSpy).not.toHaveBeenCalled();
	});
});
