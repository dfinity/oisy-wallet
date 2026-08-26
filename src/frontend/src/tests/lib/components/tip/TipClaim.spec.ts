import TipClaim from '$lib/components/tip/TipClaim.svelte';
import { LOGIN_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import type { PendingTipClaim } from '$lib/types/tip';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// Handing the tip to the wallet is now what this page does last, so the
// navigation is part of its behaviour and has to be observable.
const goto = vi.fn();
vi.mock('$app/navigation', () => ({ goto: (path: string) => goto(path) }));

vi.mock('$icp/api/icrc-ledger.api', () => ({ metadata: vi.fn() }));

describe('TipClaim', () => {
	const tipId = 'the-tip-id';
	const claimCode = 'the-claim-code';
	const ledgerCanisterId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');

	const setFragment = (hash: string) => {
		window.location.hash = hash;
	};

	const pendingClaim = (): PendingTipClaim | undefined => {
		const modal = get(modalStore);
		return modal?.type === 'tip-claim' ? (modal.data as PendingTipClaim) : undefined;
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		goto.mockReset();
		modalStore.close();
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
		const renderPreview = () => {
			setFragment(`#c=${claimCode}`);
			vi.spyOn(tipServices, 'loadTipPreview').mockResolvedValue({
				amount: 500_000n,
				ledger_canister_id: ledgerCanisterId,
				expires_at_ns: 1_800_000_000_000_000_000n
			});
			mockAuthStore(null);

			return render(TipClaim, { props: { tipId } });
		};

		it('leads with what there is to claim, not with a sign-in prompt', async () => {
			// The whole point of the landing page: someone who has never heard of
			// OISY has to learn what they have been given before being asked to
			// create anything.
			const { getByText } = renderPreview();

			await waitFor(() => expect(getByText(/Tip is Ready/)).toBeInTheDocument());

			expect(getByText(get(i18n).tip.text.claim_ready_description)).toBeInTheDocument();
		});

		it('never prints raw base units when the ledger will not say how to format them', async () => {
			// 1 ICP is 100_000_000 base units. Printing the integer because the
			// metadata lookup came back empty is not a degraded label, it is a wrong
			// number eight orders of magnitude out — on the one line the whole page
			// exists to deliver.
			const { getByText, queryByText } = renderPreview();

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.claim_ready_title_plain)).toBeInTheDocument()
			);

			expect(queryByText(/500000/)).not.toBeInTheDocument();
		});

		it('discloses that the sender learns who claimed before asking anyone to sign in', async () => {
			// The claim now follows straight from sign-in, so this line is the last
			// point at which the recipient can still walk away — and it has to be
			// readable by someone who has not identified themselves to anyone yet.
			const { container, getByText } = renderPreview();

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.claimer_disclosure)).toBeInTheDocument()
			);

			expect(container.querySelector(`button[data-tid=${LOGIN_BUTTON}]`)).toBeInTheDocument();
		});

		it('offers sign-in but never the message', async () => {
			const detailsSpy = vi.spyOn(tipServices, 'loadTipDetails');

			const { container } = renderPreview();

			await waitFor(() =>
				expect(container.querySelector(`button[data-tid=${LOGIN_BUTTON}]`)).toBeInTheDocument()
			);

			// The message belongs to whoever claims: the anonymous preview must not
			// fetch it, let alone show it.
			expect(detailsSpy).not.toHaveBeenCalled();
		});
	});

	describe('signed in', () => {
		beforeEach(() => {
			setFragment(`#c=${claimCode}`);
			mockAuthStore();
		});

		it('hands the tip to the wallet instead of claiming here', async () => {
			// A claim is something that happens to your wallet, so it is watched from
			// your wallet. This page's last act is to pass the tip over.
			const detailsSpy = vi.spyOn(tipServices, 'loadTipDetails');
			const claimSpy = vi.spyOn(tipServices, 'claimTip');

			render(TipClaim, { props: { tipId } });

			await waitFor(() => expect(pendingClaim()).toEqual({ tipId, claimCode }));
			await waitFor(() => expect(goto).toHaveBeenCalledWith('/'));

			expect(detailsSpy).not.toHaveBeenCalled();
			expect(claimSpy).not.toHaveBeenCalled();
		});

		it('keeps the claim code out of the URL the wallet lands on', async () => {
			// The code travels in memory as the modal's data. Putting it in the URL
			// would leave the whole authorisation in the wallet's history.
			render(TipClaim, { props: { tipId } });

			await waitFor(() => expect(goto).toHaveBeenCalled());

			expect(goto.mock.calls.flat().join(' ')).not.toContain(claimCode);
		});

		it('hands nothing over when the link lost its fragment', async () => {
			setFragment('');

			const { getByText } = render(TipClaim, { props: { tipId } });

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.unavailable_title)).toBeInTheDocument()
			);

			expect(pendingClaim()).toBeUndefined();
			expect(goto).not.toHaveBeenCalled();
		});
	});
});
