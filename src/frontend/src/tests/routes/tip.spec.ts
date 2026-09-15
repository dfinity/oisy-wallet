import * as tipServices from '$lib/services/tip.services';
import TipPage from '$routes/(public)/tip/+page@.svelte';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';

vi.mock('$app/navigation', () => ({
	goto: vi.fn(),
	preloadData: vi.fn()
}));

vi.mock('$icp/api/icrc-ledger.api', () => ({ metadata: vi.fn() }));

describe('/tip', () => {
	const ledgerCanisterId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

	const setFragment = (hash: string) => {
		window.location.hash = hash;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		mockAuthStore(null);
		setFragment('');
	});

	// The fragment is the only thing that says which tip this is, and changing it
	// navigates nowhere — the browser fires `hashchange` and the page stays put.
	// Read straight into a `$derived`, `window.location.hash` was sampled once and
	// never again, so a second link opened in the same tab went on showing the
	// first tip. That is the likely path rather than an exotic one: the
	// unavailable screen tells the reader to ask for a new link, and pasting it
	// here is what they then do.
	it('loads the new tip when the fragment changes', async () => {
		const previewSpy = vi.spyOn(tipServices, 'loadTipPreview').mockResolvedValue({
			amount: 500_000n,
			ledger_canister_id: ledgerCanisterId,
			expires_at_ns: 1_800_000_000_000_000_000n
		});

		setFragment('#i=first-tip&c=first-code');

		render(TipPage);

		await waitFor(() => expect(previewSpy).toHaveBeenCalledWith({ tipId: 'first-tip' }));

		setFragment('#i=second-tip&c=second-code');
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		await waitFor(() => expect(previewSpy).toHaveBeenCalledWith({ tipId: 'second-tip' }));
	});

	it('starts the second tip from scratch rather than keeping the first one on screen', async () => {
		// Keyed on the fragment, so the claim remounts. Without that the second tip
		// would inherit whatever state the first had reached — its preview, its
		// token metadata, the step it was on.
		vi.spyOn(tipServices, 'loadTipPreview')
			.mockResolvedValueOnce({
				amount: 500_000n,
				ledger_canister_id: ledgerCanisterId,
				expires_at_ns: 1_800_000_000_000_000_000n
			})
			.mockImplementationOnce(() => new Promise(() => {}));

		setFragment('#i=first-tip&c=first-code');

		const { container } = render(TipPage);

		await waitFor(() => expect(container.querySelector('h1')).toBeInTheDocument());

		setFragment('#i=second-tip&c=second-code');
		window.dispatchEvent(new HashChangeEvent('hashchange'));

		// The second lookup never resolves, so a remounted claim is back on its
		// loading state. A retained one would still be showing the first tip.
		await waitFor(() => expect(container.querySelector('h1')).not.toBeInTheDocument());
	});
});
