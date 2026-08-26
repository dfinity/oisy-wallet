import type { MyTip } from '$declarations/backend/backend.did';
import TipHistory from '$lib/components/tip/TipHistory.svelte';
import {
	TIP_HISTORY_CANCEL_BUTTON,
	TIP_HISTORY_LINK_BUTTON
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

	it('offers Cancel only on live reservations', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'live', status: { Reserved: null } }),
			tip({ tip_id: 'gone', status: { Expired: null } }),
			tip({ tip_id: 'done', status: { Claimed: null }, claimed_by: [claimer] }),
			tip({ tip_id: 'stopped', status: { Cancelled: null } })
		]);

		const { container } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink: vi.fn() } });

		await waitFor(() =>
			expect(
				container.querySelectorAll(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
			).toHaveLength(1)
		);
	});

	it('names the claimer on a claimed tip', async () => {
		// The claim screen told the recipient the sender would see this, so History
		// has to actually show it.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'done', status: { Claimed: null }, claimed_by: [claimer] })
		]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink: vi.fn() } });

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
			props: { onClose: vi.fn(), onViewLink: vi.fn() }
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
			props: { onClose: vi.fn(), onViewLink: vi.fn() }
		});

		await waitFor(() => expect(getAllByText(get(i18n).tip.text.status_expired)).toHaveLength(1));
	});

	it('groups rows under the day they were created', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			{ ...tip({ tip_id: 'live', status: { Reserved: null } }), created_at_ns: nowNs }
		]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink: vi.fn() } });

		await waitFor(() => expect(getByText(/today/i)).toBeInTheDocument());
	});

	it('hands the recovered link up rather than recovering it twice', async () => {
		// The link is rebuilt from the sender's own encrypted copy and then handed
		// to the share step, which already knows how to render a QR and a copy
		// action. Nothing here builds a second link screen.
		const onViewLink = vi.fn();
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'live', status: { Reserved: null } })
		]);
		vi.spyOn(tipServices, 'recoverTipLink').mockResolvedValue('https://oisy.com/tip/live#c=code');

		const { container } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink } });

		await waitFor(() =>
			expect(
				container.querySelector(`button[data-tid=${TIP_HISTORY_LINK_BUTTON}]`)
			).toBeInTheDocument()
		);

		container
			.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_HISTORY_LINK_BUTTON}]`)
			?.click();

		await waitFor(() =>
			expect(onViewLink).toHaveBeenCalledWith(
				expect.objectContaining({ link: 'https://oisy.com/tip/live#c=code' })
			)
		);
	});

	it('says so plainly when a tip has no recoverable link', async () => {
		// Tips created before the encrypted store existed have no copy to recover.
		// That is a fact about the tip, not a failure, so it must not read as one.
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([
			tip({ tip_id: 'old', status: { Reserved: null } })
		]);
		vi.spyOn(tipServices, 'recoverTipLink').mockResolvedValue(undefined);
		const onViewLink = vi.fn();

		const { container } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink } });

		await waitFor(() =>
			expect(
				container.querySelector(`button[data-tid=${TIP_HISTORY_LINK_BUTTON}]`)
			).toBeInTheDocument()
		);

		container
			.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_HISTORY_LINK_BUTTON}]`)
			?.click();

		await waitFor(() => expect(tipServices.recoverTipLink).toHaveBeenCalledOnce());

		expect(onViewLink).not.toHaveBeenCalled();
	});

	it('shows an empty state rather than a bare list', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink: vi.fn() } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.history_empty)).toBeInTheDocument());
	});

	it('revokes the allowance as well as cancelling, and reloads', async () => {
		// Cancelling is two operations and the list must reflect the result, so a
		// stale row cannot keep offering Cancel on a tip that is already stopped.
		const loadSpy = vi
			.spyOn(tipServices, 'loadMyTips')
			.mockResolvedValueOnce([tip({ tip_id: 'live', status: { Reserved: null } })])
			.mockResolvedValueOnce([tip({ tip_id: 'live', status: { Cancelled: null } })]);
		const cancelSpy = vi.spyOn(tipServices, 'cancelTip').mockResolvedValue(undefined);

		const { container } = render(TipHistory, { props: { onClose: vi.fn(), onViewLink: vi.fn() } });

		await waitFor(() =>
			expect(
				container.querySelector(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
			).toBeInTheDocument()
		);

		container
			.querySelector<HTMLButtonElement>(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
			?.click();

		await waitFor(() => expect(cancelSpy).toHaveBeenCalledOnce());
		await waitFor(() => expect(loadSpy).toHaveBeenCalledTimes(2));
		await waitFor(() =>
			expect(
				container.querySelector(`button[data-tid=${TIP_HISTORY_CANCEL_BUTTON}]`)
			).not.toBeInTheDocument()
		);
	});
});
