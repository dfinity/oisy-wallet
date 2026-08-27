import type { MyTip } from '$declarations/backend/backend.did';
import TipHistory from '$lib/components/tip/TipHistory.svelte';
import {
	TIP_HISTORY_CANCEL_BUTTON,
	TIP_HISTORY_ROW_BUTTON
} from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipHistory', () => {
	const claimer = Principal.fromText('aaaaa-aa');
	const nowNs = BigInt(Date.now()) * 1_000_000n;

	const tip = ({
		tip_id,
		status,
		claimed_by = []
	}: {
		tip_id: string;
		status: MyTip['status'];
		claimed_by?: MyTip['claimed_by'];
	}): MyTip => ({
		tip_id,
		ledger_canister_id: Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai'),
		amount: 500_000n,
		expires_at_ns: 1_800_000_000_000_000_000n,
		created_at_ns: 1_700_000_000_000_000_000n,
		status,
		message: [],
		claimed_by,
		last_claim_failure: []
	});

	beforeEach(() => {
		vi.restoreAllMocks();
		mockAuthStore();
	});

	it('makes only a live row openable', async () => {
		// A finished tip has no live link, so its row must not offer a click that
		// would do nothing — and there are no other buttons in the list at all now
		// that cancelling lives on the detail screen.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'live', status: { Reserved: null } }),
			tip({ tip_id: 'gone', status: { Expired: null } }),
			tip({ tip_id: 'done', status: { Claimed: null }, claimed_by: [claimer] }),
			tip({ tip_id: 'stopped', status: { Cancelled: null } })
		]);

		const { container } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip: vi.fn() } });

		await waitFor(() =>
			expect(container.querySelectorAll(`button[data-tid=${TIP_HISTORY_ROW_BUTTON}]`)).toHaveLength(
				1
			)
		);

		// Cancel moved to the detail screen, so no row carries one any more.
		expect(
			container.querySelector(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
		).not.toBeInTheDocument();
	});

	it('names the claimer on a claimed tip', async () => {
		// The claim screen told the recipient the sender would see this, so History
		// has to actually show it.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'done', status: { Claimed: null }, claimed_by: [claimer] })
		]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip: vi.fn() } });

		await waitFor(() => expect(getByText(/aaaaa-aa/)).toBeInTheDocument());
	});

	it('names each row by its amount rather than repeating one label', async () => {
		// Every row used to lead with the words "Tip created", which said nothing
		// and pushed the only distinguishing fact — the sum — off to one side.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'done', status: { Claimed: null }, claimed_by: [claimer] }),
			tip({ tip_id: 'live', status: { Reserved: null } })
		]);

		const { getAllByText, queryByText } = render(TipHistory, {
			props: { onClose: vi.fn(), onOpenTip: vi.fn() }
		});

		await waitFor(() => expect(getAllByText('Tip 0.005 ICP')).toHaveLength(2));

		// Unsigned: "Tip -0.005 ICP" would read as a negative tip, not as a debit.
		expect(queryByText(/-0.005 ICP/)).not.toBeInTheDocument();
	});

	it('states each status once, on the right', async () => {
		// An expired row said "Expired" twice — once in the status column and again
		// after the date, where it added nothing. Reserved and Claimed rows put
		// something genuinely new on that second line (time left, who claimed it),
		// so it is only the redundant case being held here.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'gone', status: { Expired: null } })
		]);

		const { getAllByText } = render(TipHistory, {
			props: { onClose: vi.fn(), onOpenTip: vi.fn() }
		});

		await waitFor(() => expect(getAllByText(get(i18n).tip.text.status_expired)).toHaveLength(1));
	});

	it('groups rows by what they need, with the failed ones first', async () => {
		// Replaces grouping by creation date. A sender scanning this screen wants to
		// know whether anything is stuck, and a date heading buried a failed tip
		// among yesterday's successful ones.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			{ ...tip({ tip_id: 'live', status: { Reserved: null } }), created_at_ns: nowNs },
			tip({ tip_id: 'done', status: { Claimed: null }, claimed_by: [claimer] }),
			tip({ tip_id: 'stuck', status: { Failed: null } })
		]);

		const { container } = render(TipHistory, {
			props: { onClose: vi.fn(), onOpenTip: vi.fn() }
		});

		const { text } = get(i18n).tip;

		// Queried as headings rather than by text: "Claimed" is also a row's status
		// word, so a bare text match is ambiguous by construction here.
		const headings = () =>
			Array.from(container.querySelectorAll('span.text-lg')).map((node) => node.textContent);

		await waitFor(() => expect(headings()).toHaveLength(3));

		// Order matters more than presence: the actionable group has to be the one
		// the reader meets first, without scrolling past what is already done.
		expect(headings()).toEqual([text.group_failed, text.group_open, text.group_claimed]);
	});

	it('explains the failed group rather than leaving "Failed" to be guessed at', async () => {
		// "Failed" on its own invites the wrong conclusion — that the money went
		// somewhere, or that the link is dead. Neither is true: nothing moved and the
		// same link still works.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'stuck', status: { Failed: null } })
		]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip: vi.fn() } });

		await waitFor(() =>
			expect(getByText(get(i18n).tip.text.group_failed_hint)).toBeInTheDocument()
		);
	});

	it('files a cancelled tip with the expired ones, still labelled Cancelled', async () => {
		// Four groups, not five: the group answers "is there anything to do here",
		// and for both of these the answer is no. The row keeps the real status.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'revoked', status: { Cancelled: null } })
		]);

		const { container, getByText, queryByText } = render(TipHistory, {
			props: { onClose: vi.fn(), onOpenTip: vi.fn() }
		});

		const { text } = get(i18n).tip;

		await waitFor(() =>
			expect(container.querySelector('span.text-lg')?.textContent).toBe(text.group_expired)
		);

		expect(getByText(text.status_cancelled)).toBeInTheDocument();
		expect(queryByText(text.group_open)).toBeNull();
	});

	it('hands the tip over on the click, without recovering anything first', async () => {
		// The bug this closes: the row awaited a vetKey derivation before the screen
		// moved, so a click on a slow first derivation looked like it had missed.
		// Recovering the link is the next screen's job, which knows how to wait.
		const onOpenTip = vi.fn();
		const recoverSpy = vi.spyOn(tipServices, 'recoverTipLink');
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'live', status: { Reserved: null } })
		]);

		const { container } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip } });

		await waitFor(() =>
			expect(
				container.querySelector(`button[data-tid=${TIP_HISTORY_ROW_BUTTON}]`)
			).toBeInTheDocument()
		);

		container
			.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_HISTORY_ROW_BUTTON}]`)
			?.click();

		expect(onOpenTip).toHaveBeenCalledWith(expect.objectContaining({ tip_id: 'live' }));
		expect(recoverSpy).not.toHaveBeenCalled();
	});

	it('shows skeleton rows while the list is loading', async () => {
		// The first load waits on a canister query and used to render an empty modal
		// while it did, which reads as "you have no tips".
		let resolve: (tips: MyTip[]) => void = () => undefined;
		vi.spyOn(tipServices, 'loadMyTips').mockReturnValue(
			new Promise<MyTip[]>((r) => {
				resolve = r;
			})
		);

		const { container, queryByText } = render(TipHistory, {
			props: { onClose: vi.fn(), onViewLink: vi.fn() }
		});

		expect(container.querySelectorAll('[data-tid^="tip-history-"]').length).toBeGreaterThan(0);
		// Crucially not the empty state, which would be a lie mid-flight.
		expect(queryByText(get(i18n).tip.text.history_empty)).not.toBeInTheDocument();

		resolve([]);

		await waitFor(() => expect(queryByText(get(i18n).tip.text.history_empty)).toBeInTheDocument());
	});

	it('shows an empty state rather than a bare list', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip: vi.fn() } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.history_empty)).toBeInTheDocument());
	});
});
