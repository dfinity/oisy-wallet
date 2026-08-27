import TipShare from '$lib/components/tip/TipShare.svelte';
import { TIP_SHARE_COPY_BUTTON } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { get, type Writable } from 'svelte/store';

// Mocked rather than spied on: the component reads a module-level `derived`,
// which captures its input stores the first time the module is imported.
vi.mock('$lib/derived/exchange.derived', async () => {
	const { writable } = await import('svelte/store');

	return { exchanges: writable<Record<symbol, { usd: number }>>({}) };
});

describe('TipShare', () => {
	const link = 'https://oisy.com/tip/abc123#c=secret';
	// 2026-08-25T12:00:00Z, as nanoseconds.
	const expiresAtNs = 1_787_486_400_000_000_000n;

	const props = {
		link,
		expiresAtNs,
		token: { ...mockValidIcToken, symbol: 'ICP', decimals: 8 },
		amount: 250_000_000n,
		onDone: vi.fn()
	};

	let rates: Writable<Record<symbol, { usd: number }>>;

	beforeAll(async () => {
		({ exchanges: rates } = (await import('$lib/derived/exchange.derived')) as unknown as {
			exchanges: Writable<Record<symbol, { usd: number }>>;
		});
	});

	beforeEach(() => {
		rates.set({});
	});

	it('confirms the amount that was actually reserved', () => {
		// This screen is the sender's only confirmation of what they committed. It
		// used to show the link and the QR but never the sum, so a fat-fingered
		// amount could be shared without the sender ever seeing the number.
		const { getByText } = render(TipShare, { props });

		expect(getByText('2.5 ICP')).toBeInTheDocument();
	});

	it('formats from the reserved base units, not from what was typed', () => {
		// 250_000_000 base units at 8 decimals is 2.5 — not 250000000, and not
		// whatever string the amount field happened to hold.
		const { queryByText } = render(TipShare, { props });

		expect(queryByText(/250000000/)).not.toBeInTheDocument();
	});

	it('offers the link for copying', () => {
		const { container, getByText } = render(TipShare, { props });

		expect(getByText(link)).toBeInTheDocument();
		expect(
			container.querySelector(`button[data-tid=${TIP_SHARE_COPY_BUTTON}]`)
		).toBeInTheDocument();
	});

	describe('what the sender is holding up', () => {
		it('quotes the fiat value beside the token amount', () => {
			// The screen is shown to whoever is about to claim, and a token amount
			// alone does not tell most people what they are being handed.
			rates.set({ [props.token.id]: { usd: 5 } });

			const { getByText } = render(TipShare, { props });

			expect(getByText('2.5 ICP')).toBeInTheDocument();
			expect(getByText(/12\.50/)).toBeInTheDocument();
		});

		it('says nothing about fiat when no rate has loaded', () => {
			// A local or newly listed ledger has no rate. Quoting one anyway — or
			// quoting zero — would be a claim about money that is simply untrue.
			const { getByText, queryByText } = render(TipShare, { props });

			expect(getByText('2.5 ICP')).toBeInTheDocument();
			expect(queryByText(/\$/)).not.toBeInTheDocument();
		});

		it('leads with the reassurance a first-time claimer needs', () => {
			const { getByText } = render(TipShare, { props });

			expect(getByText(get(i18n).tip.text.no_wallet_needed_title)).toBeInTheDocument();
		});

		it('leads with the fiat value and keeps the token amount beneath it', () => {
			// "$12.50" is what the person being tipped understands; "2.5 ICP" is the
			// mechanism. Both are shown, and the order is the point.
			rates.set({ [props.token.id]: { usd: 5 } });

			const { container, getByText } = render(TipShare, { props });

			expect(getByText('$12.50')).toBeInTheDocument();
			expect(getByText('2.5 ICP')).toBeInTheDocument();

			// The headline is the fiat one, not the token one.
			expect(container.querySelector('.text-3xl')?.textContent).toBe('$12.50');
		});

		it('falls back to the token amount as the headline when no rate has loaded', () => {
			// Normal for a local or newly listed token. Better a token amount in the
			// headline than an empty space where a price should be.
			rates.set({});

			const { container, queryByText } = render(TipShare, { props });

			expect(container.querySelector('.text-3xl')?.textContent).toContain('2.5 ICP');
			expect(queryByText('$12.50')).toBeNull();
		});
	});

	describe('when the link could not be saved', () => {
		it('tells the sender to copy it now', () => {
			// The tip is real either way; what is lost is finding this link again. Said
			// here because this is the only moment the link is still on screen.
			const { getByText } = render(TipShare, { props: { ...props, linkNotSaved: true } });

			expect(getByText(get(i18n).tip.text.link_not_saved)).toBeInTheDocument();
		});

		it('stays quiet when it was saved', () => {
			const { queryByText } = render(TipShare, { props });

			expect(queryByText(get(i18n).tip.text.link_not_saved)).toBeNull();
		});
	});
});
