import TipClaim from '$lib/components/tip/TipClaim.svelte';
import { LOGIN_BUTTON, TIP_CLAIM_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipClaim', () => {
	const tipId = 'the-tip-id';
	const claimCode = 'the-claim-code';

	const setFragment = (hash: string) => {
		window.location.hash = hash;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		setFragment('');
	});

	describe('a link that cannot be claimed', () => {
		it('shows the unavailable state without asking the backend anything', async () => {
			// A fragment-less link is unclaimable by anyone, so there is nothing to
			// look up — and looking it up anyway would turn a truncated link into a
			// probe that confirms the tip exists.
			const previewSpy = vi.spyOn(tipServices, 'loadTipPreview');
			mockAuthStore(null);

			const { getByText } = render(TipClaim, { props: { tipId } });

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.unavailable_title)).toBeInTheDocument()
			);

			expect(previewSpy).not.toHaveBeenCalled();
		});

		it('collapses a rejected lookup into the same unavailable state', async () => {
			// Unknown, expired, cancelled and already-claimed all arrive here as one
			// error, and all must look identical to whoever opened the link.
			setFragment(`#c=${claimCode}`);
			vi.spyOn(tipServices, 'loadTipPreview').mockRejectedValue({ NotFound: null });
			mockAuthStore(null);

			const { getByText } = render(TipClaim, { props: { tipId } });

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.unavailable_title)).toBeInTheDocument()
			);
		});
	});

	describe('signed out', () => {
		const renderPreview = async () => {
			setFragment(`#c=${claimCode}`);
			vi.spyOn(tipServices, 'loadTipPreview').mockResolvedValue({
				amount: 500_000n,
				ledger_canister_id: (await import('@icp-sdk/core/principal')).Principal.fromText(
					'ryjl3-tyaaa-aaaaa-aaaba-cai'
				),
				expires_at_ns: 1_800_000_000_000_000_000n
			});
			mockAuthStore(null);

			return render(TipClaim, { props: { tipId } });
		};

		it('leads with what there is to claim, not with a sign-in prompt', async () => {
			// The whole point of the landing page: someone who has never heard of
			// OISY has to learn what they have been given before being asked to
			// create anything.
			const { getByText } = await renderPreview();

			await waitFor(() => expect(getByText(/Tip is Ready/)).toBeInTheDocument());

			expect(getByText(get(i18n).tip.text.claim_ready_description)).toBeInTheDocument();
		});

		it('offers sign-in but never the message', async () => {
			const detailsSpy = vi.spyOn(tipServices, 'loadTipDetails');

			const { container } = await renderPreview();

			await waitFor(() =>
				expect(container.querySelector(`button[data-tid=${LOGIN_BUTTON}]`)).toBeInTheDocument()
			);

			// The message belongs to the authenticated review only: the anonymous
			// preview must not fetch it, let alone show it.
			expect(detailsSpy).not.toHaveBeenCalled();
		});
	});

	describe('signed in', () => {
		const details = {
			amount: 500_000n,
			expires_at_ns: 1_800_000_000_000_000_000n,
			message: ['thanks for the help'] as [string]
		};

		const renderReview = async () => {
			setFragment(`#c=${claimCode}`);
			mockAuthStore();
			vi.spyOn(tipServices, 'loadTipDetails').mockResolvedValue({
				...details,
				ledger_canister_id: (await import('@icp-sdk/core/principal')).Principal.fromText(
					'ryjl3-tyaaa-aaaaa-aaaba-cai'
				)
			});
			return render(TipClaim, { props: { tipId } });
		};

		it('shows the message and discloses that the sender learns who claimed', async () => {
			const { container, getByText } = await renderReview();

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.claimer_disclosure)).toBeInTheDocument()
			);

			expect(getByText(`“${details.message[0]}”`)).toBeInTheDocument();
			expect(container.querySelector(`button[data-tid=${TIP_CLAIM_BUTTON}]`)).toBeInTheDocument();
		});

		it('quotes no fee to the claimer, who pays none', async () => {
			// The drawn design carries a "Network fee" row. The allowance covers the
			// payout fee out of the sender's balance, so showing one here would be a
			// lie about the recipient's side of the trade.
			const { queryByText } = await renderReview();

			await waitFor(() =>
				expect(queryByText(get(i18n).tip.text.claimer_disclosure)).toBeInTheDocument()
			);

			expect(queryByText(get(i18n).tip.text.total_estimated_fee)).not.toBeInTheDocument();
			expect(queryByText(get(i18n).tip.text.payout_fee)).not.toBeInTheDocument();
		});

		it('tells the claimer plainly when the reservation is gone', async () => {
			// `Uncovered` is the one failure deliberately distinguishable from the
			// rest, because "try later" is actionable where "expired" is not.
			const { container, getByText } = await renderReview();

			await waitFor(() =>
				expect(container.querySelector(`button[data-tid=${TIP_CLAIM_BUTTON}]`)).toBeInTheDocument()
			);

			vi.spyOn(tipServices, 'claimTip').mockRejectedValue({ Uncovered: null });
			container.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_CLAIM_BUTTON}]`)?.click();

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.uncovered_title)).toBeInTheDocument()
			);
		});

		it('confirms a successful claim', async () => {
			const { container, getByText } = await renderReview();

			await waitFor(() =>
				expect(container.querySelector(`button[data-tid=${TIP_CLAIM_BUTTON}]`)).toBeInTheDocument()
			);

			vi.spyOn(tipServices, 'claimTip').mockResolvedValue({
				amount: details.amount,
				block_index: 7n,
				ledger_canister_id: (await import('@icp-sdk/core/principal')).Principal.fromText(
					'ryjl3-tyaaa-aaaaa-aaaba-cai'
				)
			});
			container.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_CLAIM_BUTTON}]`)?.click();

			await waitFor(() => expect(getByText(get(i18n).tip.text.claimed_title)).toBeInTheDocument());
		});
	});
});
