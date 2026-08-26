import TipShare from '$lib/components/tip/TipShare.svelte';
import { TIP_SHARE_COPY_BUTTON } from '$lib/constants/test-ids.constants';
import { i18n } from '$lib/stores/i18n.store';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

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

	it('warns that the link is a bearer instrument', () => {
		// The drawn design has no equivalent line. Anyone holding this link can
		// claim it, so the screen cannot ship without saying so.
		const { getByText } = render(TipShare, { props });

		expect(getByText(get(i18n).tip.text.share_description)).toBeInTheDocument();
	});

	it('offers the link for copying', () => {
		const { container, getByText } = render(TipShare, { props });

		expect(getByText(link)).toBeInTheDocument();
		expect(
			container.querySelector(`button[data-tid=${TIP_SHARE_COPY_BUTTON}]`)
		).toBeInTheDocument();
	});
});
