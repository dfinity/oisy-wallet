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

		// Sell intent (side label + base symbol) and the Open status pill.
		expect(container).toHaveTextContent('Sell');
		expect(container).toHaveTextContent('ICP');
		expect(container).toHaveTextContent('Open');
	});

	it('opens the order-detail modal with the order on click', async () => {
		const openSpy = vi.spyOn(modalStore, 'openOisyTradeOrderDetail');

		const { container } = render(TradingOrderRow, { props: { order } });

		await fireEvent.click(container.querySelector('button') as HTMLButtonElement);

		expect(openSpy).toHaveBeenCalledWith(expect.objectContaining({ data: order }));
	});

	// The status label span sits alongside its optional leading glyph inside the badge;
	// its parent is the flex wrapper that holds both.
	const badgeGlyphWrapper = (getByText: (text: string) => HTMLElement, label: string) =>
		getByText(label).parentElement;

	it.each([
		{ status: 'Filled' as const, label: 'Filled' },
		{ status: 'Canceled' as const, label: 'Canceled' }
	])('renders a leading SVG glyph for the $status badge', ({ status, label }) => {
		const { getByText } = render(TradingOrderRow, { props: { order: { ...order, status } } });

		expect(badgeGlyphWrapper(getByText, label)?.querySelector('svg')).not.toBeNull();
	});

	it('renders the ⏱ emoji glyph for the Expired badge', () => {
		const { getByText } = render(TradingOrderRow, {
			props: { order: { ...order, status: 'Expired' } }
		});

		expect(getByText('⏱')).toBeInTheDocument();
		expect(badgeGlyphWrapper(getByText, 'Expired')?.querySelector('svg')).toBeNull();
	});

	it('renders no leading glyph for an active (Open) badge', () => {
		const { getByText, queryByText } = render(TradingOrderRow, { props: { order } });

		expect(badgeGlyphWrapper(getByText, 'Open')?.querySelector('svg')).toBeNull();
		expect(queryByText('⏱')).toBeNull();
	});
});
