import CyclesTopUpRecentCanisters from '$icp/components/cycles-top-up/CyclesTopUpRecentCanisters.svelte';
import { icTransactionsStore } from '$icp/stores/ic-transactions.store';
import type { IcTransactionUi } from '$icp/types/ic-transaction';
import { CYCLES_TOP_UP_RECENT_CANISTER } from '$lib/constants/test-ids.constants';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockTcyclesToken } from '$tests/mocks/cycles-mint.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('CyclesTopUpRecentCanisters', () => {
	const canister = 'ywcsb-maaaa-aaaai-q6k7a-cai';

	const topUp: IcTransactionUi = {
		id: '1',
		type: 'burn',
		typeLabel: 'transaction.label.top_up',
		to: canister,
		value: 1_000_000_000_000n,
		timestamp: 1_700_000_000_000_000_000n,
		status: 'executed'
	};

	beforeEach(() => {
		icTransactionsStore.reset(mockTcyclesToken.id);
	});

	it('lists nothing without top-ups in the loaded history', () => {
		const { container } = render(CyclesTopUpRecentCanisters, {
			props: { token: mockTcyclesToken, onSelect: vi.fn() }
		});

		expect(container).not.toHaveTextContent(en.cycles_top_up.text.recently_topped_up);
	});

	it('lists the topped-up canisters and fills one in when picked', async () => {
		icTransactionsStore.append({
			tokenId: mockTcyclesToken.id,
			transactions: [{ data: topUp, certified: true }]
		});

		const onSelect = vi.fn();

		const { container, getByTestId } = render(CyclesTopUpRecentCanisters, {
			props: { token: mockTcyclesToken, onSelect }
		});

		expect(container).toHaveTextContent(en.cycles_top_up.text.recently_topped_up);
		expect(container).toHaveTextContent(shortenWithMiddleEllipsis({ text: canister }));

		const button = getByTestId(CYCLES_TOP_UP_RECENT_CANISTER).querySelector('button');

		expect(button).not.toBeNull();

		await fireEvent.click(button as HTMLButtonElement);

		expect(onSelect).toHaveBeenCalledExactlyOnceWith(canister);
	});
});
