import type { IcToken } from '$icp/types/ic-token';
import TradingOrderRow from '$lib/components/trading/TradingOrderRow.svelte';
import { modalStore } from '$lib/stores/modal.store';
import type { OisyTradeOrderView } from '$lib/types/oisy-trade';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

const base: IcToken = { ...mockValidIcToken, symbol: 'ICP', decimals: 8 };
const quote: IcToken = { ...mockValidIcToken, symbol: 'ckUSDC', decimals: 6 };

const order: OisyTradeOrderView = {
	id: 'order-1',
	side: 'sell',
	base,
	quote,
	quantity: 10,
	price: 2.5,
	filledQuantity: 0,
	status: 'Open'
};

describe('TradingOrderRow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		modalStore.close();
	});

	it('renders the order intent and status pill', () => {
		const { container } = render(TradingOrderRow, { props: { order } });

		expect(container).toHaveTextContent('ICP');
	});

	it('opens the order-detail modal with the order on click', async () => {
		const openSpy = vi.spyOn(modalStore, 'openOisyTradeOrderDetail');

		const { container } = render(TradingOrderRow, { props: { order } });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ data: order }));
	});
});
