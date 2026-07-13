import LimitOrderPriceSection from '$lib/components/trading/limit-order/LimitOrderPriceSection.svelte';
import type { LimitOrderPairView, LimitOrderSide, PricePreset } from '$lib/utils/oisy-trade.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LimitOrderPriceSection', () => {
	const pairView: LimitOrderPairView = {
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		baseDecimals: 8,
		quoteDecimals: 6,
		lotSize: 0.25,
		tickSize: 0.0005,
		minNotional: 1,
		maxNotional: null,
		makerFeeBps: 10,
		takerFeeBps: 20
	};

	const depthLevels = {
		asks: [{ price: 11, quantity: 5 }],
		bids: [{ price: 10, quantity: 5 }]
	};

	const baseProps = {
		price: '12',
		activePreset: null as PricePreset | null,
		side: 'sell' as LimitOrderSide,
		pairView,
		currentValue: 10.5,
		bid: 10,
		ask: 11,
		fillOrKill: false,
		baseNum: 1,
		freeSpend: 100,
		depthLevels,
		onPriceInput: () => {}
	};

	it('renders the resting price label for a non-crossing sell', () => {
		const { container } = render(LimitOrderPriceSection, { props: { ...baseProps } });

		// Sell at 12 (above bid 10) rests.
		expect(container).toHaveTextContent(
			en.trading.limit_order.price_label_sell_resting.split(' $')[0]
		);
	});

	it('renders the default label when no pair view is present', () => {
		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, pairView: undefined }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.price_label_default);
	});

	it('disables the price input when no pair view is present', () => {
		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, pairView: undefined }
		});

		expect(container.querySelector('input')).toBeDisabled();
	});

	it('shows a crossing warning for a sell priced at or below the bid', () => {
		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, price: '9' }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.warning_crossing_sell);
	});

	it('shows the FOK-blocked warning for a fill-or-kill order that cannot cross', () => {
		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, price: '12', fillOrKill: true }
		});

		// Sell at 12 above bid → FOK would be canceled.
		expect(container.textContent).toContain('fill-or-kill');
	});

	it('shows a tick-size error when the price is not a multiple of the tick', () => {
		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, price: '12.00031' }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.error_tick_multiple.split(' $')[0]);
	});

	it('calls onPriceInput when typing into the input', async () => {
		const onPriceInput = vi.fn();

		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, onPriceInput }
		});

		await fireEvent.input(container.querySelector('input') as HTMLInputElement, {
			target: { value: '13' }
		});

		expect(onPriceInput).toHaveBeenCalledWith('13');
	});

	it('sets the price and active preset when a preset button is clicked', async () => {
		const props = $state({ ...baseProps, price: '', activePreset: null as PricePreset | null });

		const { getByText } = render(LimitOrderPriceSection, { props });

		// "0%" preset → currentValue snapped to tick.
		await fireEvent.click(getByText(en.trading.limit_order.preset_market));

		expect(props.activePreset).toBe(0);
		expect(parseFloat(props.price)).toBeGreaterThan(0);
	});

	it('borders the latched preset and no other', () => {
		const { getByText } = render(LimitOrderPriceSection, {
			props: { ...baseProps, activePreset: 1 as PricePreset | null }
		});

		expect(getByText(en.trading.limit_order.preset_sell_1)).toHaveClass('border-brand-primary');
		expect(getByText(en.trading.limit_order.preset_market)).not.toHaveClass('border-brand-primary');
	});

	it('borders no preset when none is latched', () => {
		const { getByText } = render(LimitOrderPriceSection, {
			props: { ...baseProps, activePreset: null as PricePreset | null }
		});

		expect(getByText(en.trading.limit_order.preset_market)).not.toHaveClass('border-brand-primary');
		expect(getByText(en.trading.limit_order.preset_sell_1)).not.toHaveClass('border-brand-primary');
	});

	it('renders the value difference when price and current value are positive', () => {
		const { container } = render(LimitOrderPriceSection, {
			props: { ...baseProps, price: '12', currentValue: 10 }
		});

		// Sell at 12 vs value 10 → +20%.
		expect(container).toHaveTextContent('%');
	});
});
