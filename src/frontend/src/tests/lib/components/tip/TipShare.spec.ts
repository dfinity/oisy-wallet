import TipShare from '$lib/components/tip/TipShare.svelte';
import {
	TIP_HISTORY_CANCEL_BUTTON,
	TIP_SHARE_COPY_BUTTON
} from '$lib/constants/test-ids.constants';
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

	it('offers the link for copying', () => {
		const { container, getByText } = render(TipShare, { props });

		expect(getByText(link)).toBeInTheDocument();
		expect(
			container.querySelector(`button[data-tid=${TIP_SHARE_COPY_BUTTON}]`)
		).toBeInTheDocument();
	});

	describe('opened from History', () => {
		it('puts the destructive action in the content and only Back in the footer', () => {
			// Two adjacent footer buttons, one of them irreversible, is the layout this
			// replaces. Cancel now sits with the link it revokes; the footer only
			// leaves the screen.
			const onCancel = vi.fn();

			const { container, getByText, queryByText } = render(TipShare, {
				props: { ...props, onCancel }
			});

			const cancel = container.querySelector<HTMLButtonElement>(
				`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`
			);

			expect(cancel).toBeInTheDocument();
			expect(getByText(get(i18n).core.text.back)).toBeInTheDocument();
			expect(queryByText(get(i18n).tip.text.done)).not.toBeInTheDocument();
		});

		it('says Done, not Back, for a tip just created', () => {
			// Without `onCancel` this is the post-creation share screen, where the
			// sender came from the wizard rather than from a list.
			const { getByText, queryByText } = render(TipShare, { props });

			expect(getByText(get(i18n).tip.text.done)).toBeInTheDocument();
			expect(queryByText(get(i18n).core.text.back)).not.toBeInTheDocument();
		});
	});

	describe('a link that is still on its way', () => {
		it('draws everything the row already knew while the link is missing', () => {
			// The screen opens on the click and the link arrives after, so the amount
			// and the deadline have to stand on their own — otherwise the transition
			// would be to an empty box.
			const { getByText, queryByText } = render(TipShare, {
				props: { ...props, link: undefined }
			});

			expect(getByText('2.5 ICP')).toBeInTheDocument();
			expect(queryByText(link)).not.toBeInTheDocument();
		});

		it('keeps the cancel action usable before the link lands', () => {
			// Cancelling needs the tip id and its ledger, both of which the row
			// carried. Waiting on a decryption to offer it would be arbitrary.
			const { container } = render(TipShare, {
				props: { ...props, link: undefined, onCancel: vi.fn() }
			});

			expect(
				container.querySelector(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
			).toBeEnabled();
		});

		it('says why there is no link instead of pulsing for ever', () => {
			// A tip from before the recovery store exists has no code to recover. The
			// screen stays — the amount, the deadline and Cancel are still the point.
			const { getByText } = render(TipShare, {
				props: { ...props, link: undefined, linkMessage: 'No link for this one' }
			});

			expect(getByText('No link for this one')).toBeInTheDocument();
			expect(getByText('2.5 ICP')).toBeInTheDocument();
		});
	});
});
