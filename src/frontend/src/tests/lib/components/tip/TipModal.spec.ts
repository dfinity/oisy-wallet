import type { MyTip } from '$declarations/backend/backend.did';
import TipModal from '$lib/components/tip/TipModal.svelte';
import {
	TIP_HISTORY_CANCEL_BUTTON,
	TIP_HISTORY_ROW_BUTTON
} from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockValidIcrcToken } from '$tests/mocks/ic-tokens.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';
import { get } from 'svelte/store';

// Mocked rather than spied on: the component reads a module-level `derived`,
// which captures its input stores the first time the module is imported.
// Partial, because the rest of this module feeds `allTokens`, which other
// modules in this import graph build on at load time.
vi.mock(import('$lib/derived/tokens.derived'), async (importOriginal) => {
	const actual = await importOriginal();
	const { readable } = await import('svelte/store');
	const { mockValidIcrcToken: token } = await import('$tests/mocks/ic-tokens.mock');

	return { ...actual, tokens: readable([token]) };
});

// The funnel is not what these tests are about, and it would otherwise reach a
// real `trackEvent`.
vi.mock('$lib/services/analytics.services', () => ({ trackEvent: vi.fn() }));

describe('TipModal', () => {
	const tip = ({ tip_id, ledger }: { tip_id: string; ledger: string }): MyTip => ({
		tip_id,
		ledger_canister_id: Principal.fromText(ledger),
		amount: 500_000n,
		expires_at_ns: 1_800_000_000_000_000_000n,
		created_at_ns: 1_700_000_000_000_000_000n,
		status: { Reserved: null },
		message: [],
		claimed_by: [],
		last_claim_failure: []
	});

	const historyRows = async ({ container, rows }: { container: HTMLElement; rows: number }) => {
		await waitFor(() =>
			expect(container.querySelectorAll(`button[data-tid=${TIP_HISTORY_ROW_BUTTON}]`)).toHaveLength(
				rows
			)
		);

		return container.querySelectorAll<HTMLButtonElement>(
			`button[data-tid=${TIP_HISTORY_ROW_BUTTON}]`
		);
	};

	// The modal opens on the intro step; History is a click away from there. Back
	// out of a tip returns to History directly, so this is only for the first trip.
	const openHistory = async ({
		container,
		getByText,
		rows
	}: {
		container: HTMLElement;
		getByText: (text: string) => HTMLElement;
		rows: number;
	}) => {
		getByText(get(i18n).tip.text.view_history).click();

		return await historyRows({ container, rows });
	};

	beforeEach(() => {
		vi.restoreAllMocks();
		mockAuthStore();
	});

	it('does not put a late recovery on another tip own share screen', async () => {
		// Recovery derives a vetKey and takes seconds, and Back is available
		// throughout — so a sender can open row A, go back and open row B while A is
		// still deriving. Both completion paths write the same `link`, so the late
		// arrival used to land on B: the claim code for one tip displayed, and
		// offered for sharing, on the screen for another.
		let resolveFirst: (link: string) => void = () => {};

		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'first', ledger: mockValidIcrcToken.ledgerCanisterId }),
			tip({ tip_id: 'second', ledger: mockValidIcrcToken.ledgerCanisterId })
		]);

		vi.spyOn(tipServices, 'recoverTipLink').mockImplementation(({ tipId }) =>
			tipId === 'first'
				? new Promise<string>((resolve) => {
						resolveFirst = resolve;
					})
				: Promise.resolve('https://oisy.com/tip#i=second&c=second-code')
		);

		const { container, getByText } = render(TipModal);

		const [firstRow] = await openHistory({ container, getByText, rows: 2 });

		firstRow.click();

		// Back to the list while the first recovery is still outstanding, then on
		// into the second tip.
		await waitFor(() => expect(getByText(get(i18n).core.text.back)).toBeInTheDocument());

		getByText(get(i18n).core.text.back).click();

		const rows = await historyRows({ container, rows: 2 });

		rows[1].click();

		await waitFor(() =>
			expect(getByText('https://oisy.com/tip#i=second&c=second-code')).toBeInTheDocument()
		);

		resolveFirst('https://oisy.com/tip#i=first&c=first-code');

		// Flushed explicitly rather than with `waitFor`, which is no use for an
		// assertion of absence: it passes on its first attempt, before the late
		// continuation has had a chance to write anything.
		await new Promise((resolve) => setTimeout(resolve, 0));
		await tick();

		// The second tip's link is what stays on screen. Asserted as the first one
		// being absent as well, since the bug was a true-looking link for the wrong
		// tip rather than a missing one.
		expect(container.textContent).not.toContain('first-code');
		expect(container.textContent).toContain('second-code');
	});

	describe('cancelling a reopened tip', () => {
		const openAndCancel = async () => {
			vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
				tip({ tip_id: 'live', ledger: mockValidIcrcToken.ledgerCanisterId })
			]);
			vi.spyOn(tipServices, 'recoverTipLink').mockResolvedValue(
				'https://oisy.com/tip#i=live&c=live-code'
			);

			const shown = vi.spyOn(toastsStore, 'toastsShow').mockImplementation(() => Symbol());
			const errored = vi.spyOn(toastsStore, 'toastsError').mockImplementation(() => Symbol());

			const { container, getByText } = render(TipModal);

			const [row] = await openHistory({ container, getByText, rows: 1 });

			row.click();

			await waitFor(() =>
				expect(
					container.querySelector(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
				).toBeInTheDocument()
			);

			container
				.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
				?.click();

			await waitFor(() => expect(shown).toHaveBeenCalledOnce());

			return { shown, errored };
		};

		it('reports plain success when the allowance went back too', async () => {
			vi.spyOn(tipServices, 'cancelTip').mockResolvedValue({ allowanceRevoked: true });

			const { shown, errored } = await openAndCancel();

			expect(shown).toHaveBeenCalledWith({
				text: get(i18n).tip.text.cancelled_toast,
				level: 'success'
			});
			expect(errored).not.toHaveBeenCalled();
		});

		it('warns without claiming a failure when only the allowance stayed behind', async () => {
			// The tip is cancelled and unclaimable, which is the half that was asked
			// for and the half that cannot be retried — `cancel_tip` refuses a second
			// attempt. So this is neither a success to gloss over nor a failure that
			// invites a retry the canister would turn down.
			vi.spyOn(tipServices, 'cancelTip').mockResolvedValue({ allowanceRevoked: false });

			const { shown, errored } = await openAndCancel();

			expect(shown).toHaveBeenCalledWith({
				text: get(i18n).tip.text.cancelled_allowance_kept,
				level: 'warn'
			});

			// Not `cancel_failed` — "Nothing has moved, so try again" was the untrue
			// part, and it must not come back as a toast alongside the warning.
			expect(errored).not.toHaveBeenCalled();
		});
	});

	it('says so rather than dropping the reader on the intro when the token is gone', async () => {
		// A tip outlives the sender's token list: a custom ICRC token can be removed
		// while a tip denominated in it is still live. The share step needs the token
		// for its symbol, decimals and logo, so its render guard failed — and the
		// wizard fell through to the intro step, which reads as a click that went
		// nowhere on a tip that is still holding money.
		const toasts = vi.spyOn(toastsStore, 'toastsError').mockImplementation(() => Symbol());
		const recoverSpy = vi.spyOn(tipServices, 'recoverTipLink');

		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			// A ledger the mocked token list does not carry.
			tip({ tip_id: 'orphan', ledger: 'ryjl3-tyaaa-aaaaa-aaaba-cai' })
		]);

		const { container, getByText } = render(TipModal);

		const [row] = await openHistory({ container, getByText, rows: 1 });

		row.click();

		await waitFor(() => expect(toasts).toHaveBeenCalledOnce());

		const [[{ msg }]] = toasts.mock.calls as unknown as [[{ msg: { text: string } }]];

		expect(msg.text).toBe(get(i18n).tip.text.token_unavailable);

		// Still on the list, and no vetKey spent on a screen that cannot be drawn.
		expect(container.querySelectorAll(`button[data-tid=${TIP_HISTORY_ROW_BUTTON}]`)).toHaveLength(
			1
		);
		expect(recoverSpy).not.toHaveBeenCalled();
	});
});
