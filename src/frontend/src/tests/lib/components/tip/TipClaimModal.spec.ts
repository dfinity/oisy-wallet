import TipClaimModal from '$lib/components/tip/TipClaimModal.svelte';
import { TIP_CLAIM_RETRY_BUTTON, TIP_RECEIVED_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import * as tokenServices from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import * as consoleUtils from '$lib/utils/console.utils';
import * as tipUtils from '$lib/utils/tip.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { IcrcMetadataResponseEntries } from '@icp-sdk/canisters/ledger/icrc';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$icp/api/icrc-ledger.api', () => ({ metadata: vi.fn() }));

// The claim enables the token on the way out. Both halves are canister writes, so
// they are stubbed; what is asserted is which token is handed to
// `autoLoadSingleToken`, since that is the decision this component makes.
vi.mock('$icp/services/icrc.services', () => ({ loadCustomTokens: vi.fn() }));
vi.mock('$icp-eth/services/icrc-token.services', () => ({ setCustomToken: vi.fn() }));

vi.mock(import('$icp/derived/icrc.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { readable } = await import('svelte/store');

	return {
		...actual,
		icrcTokens: readable([
			{
				id: Symbol('ckTest'),
				ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
				enabled: false,
				symbol: 'ckTEST'
			}
		])
	};
});

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

	const acknowledge = async () => {
		mockDetails();
		mockClaim();
		modalStore.openTipClaim({ id: Symbol(), data: pending });

		const { container } = render(TipClaimModal, { props: { pending } });

		await waitFor(() =>
			expect(container.querySelector(`button[data-tid=${TIP_RECEIVED_BUTTON}]`)).toBeInTheDocument()
		);

		container.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_RECEIVED_BUTTON}]`)?.click();
	};

	it('closes on acknowledgement for a claimer who has been here before', async () => {
		vi.spyOn(tipUtils, 'hasSeenTipWelcome').mockReturnValue(true);

		await acknowledge();

		await waitFor(() => expect(get(modalStore)).toBeNull());
	});

	it('introduces OISY to a first-time claimer instead of just closing', async () => {
		// Somebody who arrived from a QR code has no idea what they just signed into
		// or how to get back to it. Acknowledging the payout is the one moment their
		// attention is already on the screen.
		vi.spyOn(tipUtils, 'hasSeenTipWelcome').mockReturnValue(false);
		const remember = vi.spyOn(tipUtils, 'rememberTipWelcomeSeen');

		await acknowledge();

		await waitFor(() => expect(get(modalStore)?.type).toBe('tip-welcome'));

		// Remembered, so the second tip does not repeat the introduction.
		expect(remember).toHaveBeenCalledOnce();
	});

	describe('making the tokens visible', () => {
		it('enables the claimed token when leaving for the wallet', async () => {
			// An ICRC token only renders once enabled, so a claimer who has never held
			// this ck-asset would watch the payout succeed and find nothing in their
			// list.
			const autoLoad = vi
				.spyOn(tokenServices, 'autoLoadSingleToken')
				.mockResolvedValue({ result: 'loaded' });

			mockDetails();
			mockClaim();

			const { getByTestId } = render(TipClaimModal, { props: { pending } });

			await waitFor(() => expect(getByTestId(TIP_RECEIVED_BUTTON)).toBeInTheDocument());

			getByTestId(TIP_RECEIVED_BUTTON).click();

			await waitFor(() => expect(autoLoad).toHaveBeenCalledOnce());

			expect(autoLoad.mock.calls[0][0].token).toMatchObject({
				ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai',
				enabled: false
			});
		});
	});

	describe('every failure has a way out', () => {
		// The bug this closes: the failed state offered "Try again" and nothing else,
		// and this modal has no title bar so there was no cross either. A claimer
		// whose payout failed was stuck on the screen.
		const cases: { name: string; err: unknown; retryable: boolean }[] = [
			{ name: 'a failed call', err: new Error('boom'), retryable: true },
			{ name: 'a short sender balance', err: { InsufficientFunds: null }, retryable: true },
			{ name: 'a withdrawn reservation', err: { Uncovered: null }, retryable: false },
			{ name: 'a dead link', err: { NotFound: null }, retryable: false }
		];

		it.each(cases)('offers Close after $name', async ({ err }) => {
			mockDetails();
			vi.spyOn(tipServices, 'claimTip').mockRejectedValue(err);
			vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

			const { getByText } = render(TipClaimModal, { props: { pending } });

			await waitFor(() => expect(getByText(get(i18n).core.text.close)).toBeInTheDocument());
		});

		it.each(cases)(
			'offers a retry after $name only when it could work',
			async ({ err, retryable }) => {
				// Offering a retry where it cannot help contradicts what the screen just
				// told the reader to do instead.
				mockDetails();
				vi.spyOn(tipServices, 'claimTip').mockRejectedValue(err);
				vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

				const { getByText, queryByText } = render(TipClaimModal, { props: { pending } });

				await waitFor(() => expect(getByText(get(i18n).core.text.close)).toBeInTheDocument());

				const retry = queryByText(get(i18n).tip.text.claim_retry);

				expect(retry === null).toBe(!retryable);
			}
		);
	});

	it('names the sender being out of funds rather than blaming the claim', async () => {
		// "Nothing was transferred, so try again" was shown for this too, which told
		// the reader nothing about who could fix it or when to come back.
		mockDetails();
		vi.spyOn(tipServices, 'claimTip').mockRejectedValue({ InsufficientFunds: null });
		vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

		const { getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() =>
			expect(getByText(get(i18n).tip.text.short_balance_title)).toBeInTheDocument()
		);

		expect(getByText(get(i18n).tip.text.short_balance_description)).toBeInTheDocument();
	});
});
