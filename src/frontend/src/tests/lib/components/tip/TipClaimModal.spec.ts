import TipClaimModal from '$lib/components/tip/TipClaimModal.svelte';
import { TIP_CLAIM_RETRY_BUTTON, TIP_RECEIVED_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import * as consoleUtils from '$lib/utils/console.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { IcrcMetadataResponseEntries } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icrc-ledger.api', () => ({ metadata: vi.fn() }));

describe('TipClaimModal', () => {
	const pending = { tipId: 'the-tip-id', claimCode: 'the-claim-code' };
	const ledgerCanisterId = Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai');
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

	let warnSpy: MockInstance<typeof consoleUtils.consoleWarn>;

	beforeEach(async () => {
		vi.restoreAllMocks();
		modalStore.close();
		mockAuthStore();

		// The failure paths log what went wrong on purpose, so the paths that fail
		// have to expect it rather than leak it into the test output.
		warnSpy = vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

		const { metadata } = await import('$icp/api/icrc-ledger.api');
		vi.mocked(metadata).mockResolvedValue([
			[IcrcMetadataResponseEntries.SYMBOL, { Text: 'ICP' }],
			[IcrcMetadataResponseEntries.NAME, { Text: 'Internet Computer' }],
			[IcrcMetadataResponseEntries.DECIMALS, { Nat: 8n }],
			[IcrcMetadataResponseEntries.FEE, { Nat: 10_000n }]
		]);
	});

	it('claims on its own, without waiting to be told to', async () => {
		// The step this replaces was a "Claim now" button on a review card. Opening
		// the link and signing in is the decision; nothing here waits for a second.
		mockDetails();
		const claimSpy = mockClaim();

		render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(claimSpy).toHaveBeenCalledWith(expect.objectContaining(pending)));
	});

	it('confirms with the amount the ledger moved, the message and a completed status', async () => {
		mockDetails();
		mockClaim();

		const { getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(/0\.005 ICP Received!/)).toBeInTheDocument());

		expect(getByText(get(i18n).tip.text.received_description)).toBeInTheDocument();
		// The sender's message is revealed to whoever claimed, and this is the one
		// screen that shows it.
		expect(getByText(`“${message}”`)).toBeInTheDocument();
		expect(getByText(get(i18n).tip.text.status_completed)).toBeInTheDocument();
	});

	it('cannot be dismissed while the payout is in flight', async () => {
		// Clicking a claim away mid-payout would leave the outcome of a money
		// movement unreported.
		mockDetails();
		let settle: (value: {
			amount: bigint;
			block_index: bigint;
			ledger_canister_id: Principal;
		}) => void = () => {};
		vi.spyOn(tipServices, 'claimTip').mockReturnValue(
			new Promise((resolve) => {
				settle = resolve;
			})
		);

		const { container, getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.claiming_title)).toBeInTheDocument());

		expect(container.querySelector('.backdrop')).toHaveClass('disablePointerEvents');

		settle({ amount: 500_000n, block_index: 7n, ledger_canister_id: ledgerCanisterId });

		await waitFor(() =>
			expect(container.querySelector('.backdrop')).not.toHaveClass('disablePointerEvents')
		);
	});

	it('never prints base units when the ledger will not say how to format them', async () => {
		// 500_000 base units is 0.005 ICP. Printing the integer because the metadata
		// lookup came back empty is not a vaguer label, it is a wrong number on the
		// line confirming what someone was just paid.
		mockDetails();
		mockClaim();
		const { metadata } = await import('$icp/api/icrc-ledger.api');
		vi.mocked(metadata).mockRejectedValue(new Error('ledger unreachable'));

		const { getByText, queryByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.claimed_title)).toBeInTheDocument());

		expect(queryByText(/500000/)).not.toBeInTheDocument();
	});

	it('says a link is unavailable without ever attempting a payout', async () => {
		// Unknown, expired, cancelled and already-claimed arrive as one error, and
		// none of them is a reason to try moving money.
		vi.spyOn(tipServices, 'loadTipDetails').mockRejectedValue({ NotFound: null });
		const claimSpy = mockClaim();

		const { getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() =>
			expect(getByText(get(i18n).tip.text.unavailable_title)).toBeInTheDocument()
		);

		expect(claimSpy).not.toHaveBeenCalled();
	});

	it('offers a retry when the review call never landed, rather than declaring the tip dead', async () => {
		// The bug this closes: a live tip with a valid code read as "no longer
		// available" because the call failed at this end. The canister rejects with a
		// candid variant; a dropped call throws an Error, and only the first is
		// evidence about the tip.
		vi.spyOn(tipServices, 'loadTipDetails').mockRejectedValueOnce(new Error('connection lost'));
		const claimSpy = mockClaim();

		const { getByText, queryByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.claim_retry)).toBeInTheDocument());

		expect(queryByText(get(i18n).tip.text.unavailable_title)).not.toBeInTheDocument();
		expect(claimSpy).not.toHaveBeenCalled();
		// The reason has to end up somewhere a developer can read it.
		expect(warnSpy).toHaveBeenCalledOnce();
	});

	it('says a tip claimed by someone else is gone, not retryable', async () => {
		// A race with another claimer comes back from `claim_tip` as NotFound. A
		// "Try again" there is an invitation to keep pressing a button that cannot
		// work.
		mockDetails();
		vi.spyOn(tipServices, 'claimTip').mockRejectedValue({ NotFound: null });

		const { getByText, queryByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() =>
			expect(getByText(get(i18n).tip.text.unavailable_title)).toBeInTheDocument()
		);

		expect(queryByText(get(i18n).tip.text.claim_retry)).not.toBeInTheDocument();
	});

	it('tells the claimer plainly when the reservation is gone', async () => {
		// `Uncovered` is the one failure deliberately distinguishable from the rest,
		// because "try later" is actionable where "expired" is not.
		mockDetails();
		vi.spyOn(tipServices, 'claimTip').mockRejectedValue({ Uncovered: null });

		const { getByText, queryByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.uncovered_title)).toBeInTheDocument());

		// Not retryable in the same sense: the funds are not there to move.
		expect(queryByText(get(i18n).tip.text.claim_retry)).not.toBeInTheDocument();
	});

	it('offers a retry when the call itself did not land', async () => {
		// Nothing moved and the tip is still claimable, so there has to be a way
		// back in — there is no "Claim now" button to press a second time.
		mockDetails();
		const claimSpy = vi
			.spyOn(tipServices, 'claimTip')
			.mockRejectedValueOnce(new Error('connection lost'));

		const { container, getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.claim_failed)).toBeInTheDocument());

		mockClaim();
		container
			.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_CLAIM_RETRY_BUTTON}]`)
			?.click();

		await waitFor(() => expect(claimSpy).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(getByText(/Received!/)).toBeInTheDocument());
	});

	it('closes on acknowledgement, since the reader is already in the wallet', async () => {
		mockDetails();
		mockClaim();
		modalStore.openTipClaim({ id: Symbol(), data: pending });

		const { container } = render(TipClaimModal, { props: { pending } });

		await waitFor(() =>
			expect(container.querySelector(`button[data-tid=${TIP_RECEIVED_BUTTON}]`)).toBeInTheDocument()
		);

		container.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_RECEIVED_BUTTON}]`)?.click();

		await waitFor(() => expect(get(modalStore)).toBeNull());
	});
});
