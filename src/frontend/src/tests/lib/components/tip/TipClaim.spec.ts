import TipClaim from '$lib/components/tip/TipClaim.svelte';
import { LOGIN_BUTTON, TIP_CLAIM_RETRY_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import type { TipReceipt } from '$lib/types/tip';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { IcrcMetadataResponseEntries } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

// The claim now ends by moving the reader into the wallet, so the navigation is
// part of what this component does and has to be observable.
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

	const mockLedgerMetadata = async () => {
		const { metadata } = await import('$icp/api/icrc-ledger.api');
		vi.mocked(metadata).mockResolvedValue([
			[IcrcMetadataResponseEntries.SYMBOL, { Text: 'ICP' }],
			[IcrcMetadataResponseEntries.NAME, { Text: 'Internet Computer' }],
			[IcrcMetadataResponseEntries.DECIMALS, { Nat: 8n }],
			[IcrcMetadataResponseEntries.FEE, { Nat: 10_000n }]
		]);
	};

	const receipt = (): TipReceipt | undefined => {
		const modal = get(modalStore);
		return modal?.type === 'tip-received' ? (modal.data as TipReceipt) : undefined;
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
		const message = 'thanks for the help';

		const mockDetails = () =>
			vi.spyOn(tipServices, 'loadTipDetails').mockResolvedValue({
				amount: 500_000n,
				expires_at_ns: 1_800_000_000_000_000_000n,
				message: [message],
				ledger_canister_id: ledgerCanisterId
			});

		const mockClaim = () =>
			vi.spyOn(tipServices, 'claimTip').mockResolvedValue({
				amount: 500_000n,
				block_index: 7n,
				ledger_canister_id: ledgerCanisterId
			});

		beforeEach(async () => {
			setFragment(`#c=${claimCode}`);
			mockAuthStore();
			await mockLedgerMetadata();
		});

		it('claims without waiting to be told to', async () => {
			// The behaviour this replaces: a review card with a "Claim now" button.
			// Signing in is the decision now, so nothing should be waiting on a
			// second press.
			mockDetails();
			const claimSpy = mockClaim();

			render(TipClaim, { props: { tipId } });

			await waitFor(() =>
				expect(claimSpy).toHaveBeenCalledWith({
					identity: expect.anything(),
					tipId,
					claimCode
				})
			);
		});

		it('hands the confirmation to the wallet and goes there', async () => {
			mockDetails();
			mockClaim();

			render(TipClaim, { props: { tipId } });

			await waitFor(() => expect(receipt()).not.toBeUndefined());

			// The amount the ledger moved, formatted — not base units, and not the
			// number a review promised.
			expect(receipt()?.amountLabel).toContain('0.005');
			expect(receipt()?.amountLabel).toContain('ICP');
			// The sender's message is revealed to the claimer, and this is now the
			// only screen that shows it.
			expect(receipt()?.message).toBe(message);

			await waitFor(() => expect(goto).toHaveBeenCalledWith('/'));
		});

		it('carries no claim code into the wallet', async () => {
			// The receipt crosses a navigation into the app. Nothing secret has any
			// business travelling with it — the code is spent by then anyway.
			mockDetails();
			mockClaim();

			render(TipClaim, { props: { tipId } });

			await waitFor(() => expect(receipt()).not.toBeUndefined());

			expect(JSON.stringify(receipt())).not.toContain(claimCode);
		});

		it('tells the claimer plainly when the reservation is gone', async () => {
			// `Uncovered` is the one failure deliberately distinguishable from the
			// rest, because "try later" is actionable where "expired" is not.
			mockDetails();
			vi.spyOn(tipServices, 'claimTip').mockRejectedValue({ Uncovered: null });

			const { getByText } = render(TipClaim, { props: { tipId } });

			await waitFor(() =>
				expect(getByText(get(i18n).tip.text.uncovered_title)).toBeInTheDocument()
			);

			expect(receipt()).toBeUndefined();
			expect(goto).not.toHaveBeenCalled();
		});

		it('offers a retry when the call itself did not land', async () => {
			// Without the "Claim now" button there is no way back into the flow, so a
			// transport failure — where nothing moved and the tip is still claimable —
			// has to offer one of its own.
			mockDetails();
			const claimSpy = vi
				.spyOn(tipServices, 'claimTip')
				.mockRejectedValueOnce(new Error('connection lost'));

			const { container, getByText } = render(TipClaim, { props: { tipId } });

			await waitFor(() => expect(getByText(get(i18n).tip.text.claim_failed)).toBeInTheDocument());

			mockClaim();
			container
				.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_CLAIM_RETRY_BUTTON}]`)
				?.click();

			await waitFor(() => expect(claimSpy).toHaveBeenCalledTimes(2));
			await waitFor(() => expect(receipt()).not.toBeUndefined());
		});
	});
});
