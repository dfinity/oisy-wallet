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
		claimed_by
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

	it('groups rows under the day they were created', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			{ ...tip({ tip_id: 'live', status: { Reserved: null } }), created_at_ns: nowNs }
		]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip: vi.fn() } });

		await waitFor(() => expect(getByText(/today/i)).toBeInTheDocument());
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

	it('shows an empty state rather than a bare list', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onOpenTip: vi.fn() } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.history_empty)).toBeInTheDocument());
	});
});
