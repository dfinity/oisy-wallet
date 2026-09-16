import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { loadCustomTokens } from '$icp/services/icrc.services';
import { setCustomToken as setCustomTokenApi } from '$lib/api/backend.api';
import TipClaimModal from '$lib/components/tip/TipClaimModal.svelte';
import { TIP_CLAIM_RETRY_BUTTON, TIP_RECEIVED_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import * as tokenServices from '$lib/services/token.services';
import { i18n } from '$lib/stores/i18n.store';
import { modalStore } from '$lib/stores/modal.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { userProfileCreated } from '$lib/stores/user-profile.store';
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
vi.mock('$lib/api/backend.api', () => ({ setCustomToken: vi.fn() }));
vi.mock('$icp-eth/services/icrc-token.services', () => ({ setCustomToken: vi.fn() }));

vi.mock(import('$icp/derived/icrc.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { readable } = await import('svelte/store');

	const { mockIcrcCustomToken } = await import('$tests/mocks/icrc-custom-tokens.mock');
	// `TokenId` is a branded symbol, so a bare `Symbol()` does not satisfy it.
	const { parseTokenId } = await import('$lib/validation/token.validation');

	// Built from the shared fixture rather than written out field by field: the
	// partial mock is type-checked against the real `IcrcCustomToken`, so a
	// hand-rolled object drifts out of shape the moment a field is added — which
	// is what made `npm run test` fail here before `vitest` could run at all.
	return {
		...actual,
		icrcTokens: readable([
			{
				...mockIcrcCustomToken,
				id: parseTokenId('ckTest'),
				ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
				enabled: false,
				symbol: 'ckTEST'
			}
		])
	};
});

describe('TipClaimModal', () => {
	const pending = { tipId: 'the-tip-id', claimCode: 'the-claim-code' };
	// ckBTC's ledger, not ICP's. The fixture used to be `ryjl3-…`, which *is* the
	// ICP ledger — so a test named for a ck-asset the claimer has never held was
	// quietly exercising the one token that is never a custom token at all.
	const ledgerCanisterId = Principal.fromText('mxzaz-hqaaa-aaaar-qaada-cai');
	const message = 'thanks for the help';

	const mockDetailsFor = (ledger: Principal) =>
		vi.spyOn(tipServices, 'loadTipDetails').mockResolvedValue({
			amount: 500_000n,
			expires_at_ns: 1_800_000_000_000_000_000n,
			message: [message],
			ledger_canister_id: ledger
		});

	const mockClaimFor = (ledger: Principal) =>
		vi.spyOn(tipServices, 'claimTip').mockResolvedValue({
			amount: 500_000n,
			block_index: 7n,
			ledger_canister_id: ledger
		});

	const mockDetails = () => mockDetailsFor(ledgerCanisterId);

	const mockClaim = () => mockClaimFor(ledgerCanisterId);

	let warnSpy: MockInstance<typeof consoleUtils.consoleWarn>;

	beforeEach(async () => {
		vi.restoreAllMocks();
		// `restoreAllMocks` restores spies but leaves a module mock's `vi.fn()`
		// holding its call history, so these two have to be cleared by hand or a
		// "was not called" assertion reads the previous test's calls.
		vi.mocked(setCustomTokenApi).mockReset();
		vi.mocked(loadCustomTokens).mockReset();
		modalStore.close();
		mockAuthStore();
		// Describes one sign-in, so it must not leak between tests.
		userProfileCreated.set(false);

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

	it('gives the dialog the name a sighted reader sees', async () => {
		// The modal omits `title` on purpose, so there is no header for
		// `aria-labelledby` to point at — which left assistive technology with an
		// unnamed dialog about someone's money.
		mockDetails();
		mockClaim();

		const { container, getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() => expect(getByText(/0\.005 ICP Received!/)).toBeInTheDocument());

		const dialog = container.querySelector('[role="dialog"]');

		expect(dialog).toHaveAttribute('aria-label', expect.stringContaining('0.005 ICP'));
		// Never both: an element carrying an `aria-label` and an `aria-labelledby`
		// leaves which one wins up to the screen reader.
		expect(dialog).not.toHaveAttribute('aria-labelledby');
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

	it('introduces OISY to a claimer who signed up to receive this tip', async () => {
		// Somebody who arrived from a QR code has no idea what they just signed into
		// or how to get back to it. Acknowledging the payout is the one moment their
		// attention is already on the screen.
		userProfileCreated.set(true);
		vi.spyOn(tipUtils, 'hasSeenTipWelcome').mockReturnValue(false);
		const remember = vi.spyOn(tipUtils, 'rememberTipWelcomeSeen');

		await acknowledge();

		await waitFor(() => expect(get(modalStore)?.type).toBe('tip-welcome'));

		// Remembered, so a second tip in the same session does not repeat it.
		expect(remember).toHaveBeenCalledOnce();
	});

	it('spares an established user the introduction', async () => {
		// The case the stored flag alone could not catch: somebody who has used OISY
		// for months and happens to be claiming their first tip does not need to be
		// told where the wallet lives.
		userProfileCreated.set(false);
		vi.spyOn(tipUtils, 'hasSeenTipWelcome').mockReturnValue(false);

		await acknowledge();

		await waitFor(() => expect(get(modalStore)).toBeNull());
	});

	it('closes for a new user who has already been introduced', async () => {
		userProfileCreated.set(true);
		vi.spyOn(tipUtils, 'hasSeenTipWelcome').mockReturnValue(true);

		await acknowledge();

		await waitFor(() => expect(get(modalStore)).toBeNull());
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
				ledgerCanisterId: 'mxzaz-hqaaa-aaaar-qaada-cai',
				enabled: false
			});
		});

		it('registers a token the claimer has never held', async () => {
			// The case that used to end in silence. `icrcTokens` is the defaults plus
			// the claimer's *own* imports, so a token the sender imported is in
			// neither half: the lookup missed, nothing was enabled, and the claim
			// finished with the tokens really theirs and nothing on screen.
			const autoLoad = vi
				.spyOn(tokenServices, 'autoLoadSingleToken')
				.mockResolvedValue({ result: 'loaded' });

			const stranger = Principal.fromText('2ouva-viaaa-aaaaq-aaamq-cai');

			mockDetailsFor(stranger);
			mockClaimFor(stranger);

			const { getByTestId } = render(TipClaimModal, { props: { pending } });

			await waitFor(() => expect(getByTestId(TIP_RECEIVED_BUTTON)).toBeInTheDocument());

			getByTestId(TIP_RECEIVED_BUTTON).click();

			await waitFor(() => expect(vi.mocked(setCustomTokenApi)).toHaveBeenCalledOnce());

			// Registered from the ledger id alone, enabled, and the list reloaded so
			// the metadata is read back off the ledger.
			const [[{ token }]] = vi.mocked(setCustomTokenApi).mock.calls;

			expect(token).toMatchObject({ enabled: true });
			expect(vi.mocked(loadCustomTokens)).toHaveBeenCalled();

			// Not the enable path: there was nothing in the list to enable.
			expect(autoLoad).not.toHaveBeenCalled();
		});

		it('leaves ICP alone rather than importing the ICP ledger', async () => {
			// ICP is always visible and never a custom token. Without this the branch
			// above reads "not in the list" as "import it" and registers the ICP
			// ledger as though the claimer had pasted it in by hand.
			const autoLoad = vi
				.spyOn(tokenServices, 'autoLoadSingleToken')
				.mockResolvedValue({ result: 'loaded' });

			mockDetailsFor(Principal.fromText(ICP_TOKEN.ledgerCanisterId));
			mockClaimFor(Principal.fromText(ICP_TOKEN.ledgerCanisterId));

			const { getByTestId } = render(TipClaimModal, { props: { pending } });

			await waitFor(() => expect(getByTestId(TIP_RECEIVED_BUTTON)).toBeInTheDocument());

			getByTestId(TIP_RECEIVED_BUTTON).click();

			await waitFor(() => expect(get(modalStore)).toBeNull());

			expect(vi.mocked(setCustomTokenApi)).not.toHaveBeenCalled();
			expect(autoLoad).not.toHaveBeenCalled();
		});

		it('does not turn a failed registration into a failed claim', async () => {
			// The money has already moved by the time this runs. A token that did not
			// get registered is a wallet with one row to add by hand, not a claim
			// that went wrong.
			vi.spyOn(tokenServices, 'autoLoadSingleToken').mockResolvedValue({ result: 'loaded' });
			const toasts = vi.spyOn(toastsStore, 'toastsError').mockImplementation(() => Symbol());

			const stranger = Principal.fromText('2ouva-viaaa-aaaaq-aaamq-cai');

			mockDetailsFor(stranger);
			mockClaimFor(stranger);
			vi.mocked(setCustomTokenApi).mockRejectedValueOnce(new Error('canister unreachable'));

			const { getByTestId } = render(TipClaimModal, { props: { pending } });

			await waitFor(() => expect(getByTestId(TIP_RECEIVED_BUTTON)).toBeInTheDocument());

			getByTestId(TIP_RECEIVED_BUTTON).click();

			// Reported, and the modal still closes onto the wallet.
			await waitFor(() => expect(toasts).toHaveBeenCalledOnce());

			expect(get(modalStore)).toBeNull();
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

	it('says to come back later without saying why', async () => {
		// "Nothing was transferred, so try again" was shown for this too, which told
		// the reader nothing about whether coming back would help. It then went too
		// far the other way and said the sender was out of funds.
		mockDetails();
		vi.spyOn(tipServices, 'claimTip').mockRejectedValue({ InsufficientFunds: null });
		vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

		const { getByText } = render(TipClaimModal, { props: { pending } });

		await waitFor(() =>
			expect(getByText(get(i18n).tip.text.short_balance_title)).toBeInTheDocument()
		);

		expect(getByText(get(i18n).tip.text.short_balance_description)).toBeInTheDocument();
	});

	describe('what the claim screen says about the sender', () => {
		// A tip link is a bearer token: it gets forwarded, screenshotted and pasted
		// into group chats, so whoever reads this screen may never have met the
		// sender. The canister already refuses to distinguish an unknown id from an
		// expired tip from a wrong code — all four answer NotFound — and this screen
		// used to undo that by reporting which of two financial situations the
		// sender was in.
		//
		// Asserted against the rendered text rather than the i18n values, because
		// the property is "nothing on this screen discloses it", not "these two
		// strings were edited".
		const DISCLOSING = /balance|out of funds|set aside|taken back|topped? up/i;

		it.each([
			{
				label: 'a revoked reservation',
				rejection: { Uncovered: null } as unknown,
				titleKey: 'uncovered_title' as const
			},
			{
				label: 'a sender who cannot cover it',
				rejection: { InsufficientFunds: null } as unknown,
				titleKey: 'short_balance_title' as const
			}
		])('keeps the sender out of it for $label', async ({ rejection, titleKey }) => {
			mockDetails();
			vi.spyOn(tipServices, 'claimTip').mockRejectedValue(rejection);
			vi.spyOn(consoleUtils, 'consoleWarn').mockImplementation(() => {});

			const { container, getByText } = render(TipClaimModal, { props: { pending } });

			await waitFor(() => expect(getByText(get(i18n).tip.text[titleKey])).toBeInTheDocument());

			expect(container.textContent).not.toMatch(DISCLOSING);
		});
	});
});
