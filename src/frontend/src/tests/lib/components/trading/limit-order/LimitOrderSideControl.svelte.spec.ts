import LimitOrderSideControl from '$lib/components/trading/limit-order/LimitOrderSideControl.svelte';
import type { LimitOrderSide } from '$lib/utils/oisy-trade.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('LimitOrderSideControl', () => {
	const getButtons = (container: HTMLElement) =>
		Array.from(container.querySelectorAll('button')) as HTMLButtonElement[];

	it('renders both sell and buy buttons', () => {
		const { getByText } = render(LimitOrderSideControl, { props: { side: 'sell' } });

		expect(getByText(en.trading.limit_order.sell)).toBeInTheDocument();
		expect(getByText(en.trading.limit_order.buy)).toBeInTheDocument();
	});

	it('marks the sell button pressed when side is sell', () => {
		const { container } = render(LimitOrderSideControl, { props: { side: 'sell' } });

		const [sellButton, buyButton] = getButtons(container);

		expect(sellButton).toHaveAttribute('aria-pressed', 'true');
		expect(buyButton).toHaveAttribute('aria-pressed', 'false');
	});

	it('marks the buy button pressed when side is buy', () => {
		const { container } = render(LimitOrderSideControl, { props: { side: 'buy' } });

		const [sellButton, buyButton] = getButtons(container);

		expect(sellButton).toHaveAttribute('aria-pressed', 'false');
		expect(buyButton).toHaveAttribute('aria-pressed', 'true');
	});

	it('updates the bound side when clicking buy', async () => {
		const props = $state<{ side: LimitOrderSide }>({ side: 'sell' });

		const { container } = render(LimitOrderSideControl, { props });

		const [, buyButton] = getButtons(container);

		await fireEvent.click(buyButton);

		expect(props.side).toBe('buy');
	});

	it('updates the bound side when clicking sell', async () => {
		const props = $state<{ side: LimitOrderSide }>({ side: 'buy' });

		const { container } = render(LimitOrderSideControl, { props });

		const [sellButton] = getButtons(container);

		await fireEvent.click(sellButton);

		expect(props.side).toBe('sell');
	});
});
