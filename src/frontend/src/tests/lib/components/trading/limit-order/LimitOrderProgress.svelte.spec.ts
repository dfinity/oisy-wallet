import LimitOrderProgress from '$lib/components/trading/limit-order/LimitOrderProgress.svelte';
import { ProgressStepsLimitOrder } from '$lib/enums/progress-steps';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('LimitOrderProgress', () => {
	it('renders the three progress step labels', () => {
		const { container } = render(LimitOrderProgress, {
			props: { progressStep: ProgressStepsLimitOrder.INITIALIZATION }
		});

		expect(container).toHaveTextContent(en.send.text.initializing);
		expect(container).toHaveTextContent(en.trading.limit_order.placing_initializing);
		expect(container).toHaveTextContent(en.send.text.refreshing_ui);
	});

	it('renders for the placing progress step', () => {
		const { container } = render(LimitOrderProgress, {
			props: { progressStep: ProgressStepsLimitOrder.PLACE }
		});

		expect(container).toHaveTextContent(en.trading.limit_order.placing_initializing);
	});
});
