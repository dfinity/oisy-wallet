import type { MyTip } from '$declarations/backend/backend.did';
import TipHistory from '$lib/components/tip/TipHistory.svelte';
import { TIP_HISTORY_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
import * as tipServices from '$lib/services/tip.services';
import { i18n } from '$lib/stores/i18n.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { Principal } from '@icp-sdk/core/principal';
import { render, waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('TipHistory', () => {
	const claimer = Principal.fromText('aaaaa-aa');

	const tip = (
		tip_id: string,
		status: MyTip['status'],
		claimed_by: MyTip['claimed_by'] = []
	): MyTip => ({
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
			tip('live', { Reserved: null }),
			tip('gone', { Expired: null }),
			tip('done', { Claimed: null }, [claimer]),
			tip('stopped', { Cancelled: null })
		]);

		const { container } = render(TipHistory, { props: { onClose: vi.fn() } });

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
			tip('done', { Claimed: null }, [claimer])
		]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn() } });

		await waitFor(() => expect(getByText(/aaaaa-aa/)).toBeInTheDocument());
	});

	it('shows an empty state rather than a bare list', async () => {
		vi.spyOn(tipServices, 'loadMyTips').mockResolvedValue([]);

		const { getByText } = render(TipHistory, { props: { onClose: vi.fn() } });

		await waitFor(() => expect(getByText(get(i18n).tip.text.history_empty)).toBeInTheDocument());
	});

	it('revokes the allowance as well as cancelling, and reloads', async () => {
		// Cancelling is two operations and the list must reflect the result, so a
		// stale row cannot keep offering Cancel on a tip that is already stopped.
		const loadSpy = vi
			.spyOn(tipServices, 'loadMyTips')
			.mockResolvedValueOnce([tip('live', { Reserved: null })])
			.mockResolvedValueOnce([tip('live', { Cancelled: null })]);
		const cancelSpy = vi.spyOn(tipServices, 'cancelTip').mockResolvedValue(undefined);

		const { container } = render(TipHistory, { props: { onClose: vi.fn() } });

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
