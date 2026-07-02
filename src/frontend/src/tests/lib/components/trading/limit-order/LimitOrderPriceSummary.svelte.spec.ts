import LimitOrderPriceSummary from '$lib/components/trading/limit-order/LimitOrderPriceSummary.svelte';
import { render } from '@testing-library/svelte';

describe('LimitOrderPriceSummary', () => {
	const baseProps = {
		priceDisplay: '2.5',
		baseSymbol: 'ICP',
		quoteSymbol: 'ckUSDC',
		valueDifference: -2,
		muted: false
	};

	it('renders the limit price and a resolved current value', () => {
		const { container } = render(LimitOrderPriceSummary, {
			props: { ...baseProps, currentValueDisplay: '2.6' }
		});

		expect(container).toHaveTextContent('2.5');
		expect(container).toHaveTextContent('2.6');
		// value-difference is rendered when a current value exists
		expect(container).toHaveTextContent('%');
	});

	it('shows "-" and hides the value-difference when there is no current value', () => {
		const { container } = render(LimitOrderPriceSummary, {
			props: { ...baseProps, currentValueDisplay: undefined }
		});

		expect(container).toHaveTextContent('-');
		expect(container).not.toHaveTextContent('%');
	});

	it('renders the queue position when provided', () => {
		const { container } = render(LimitOrderPriceSummary, {
			props: { ...baseProps, currentValueDisplay: '2.6', queueText: 'Front of book' }
		});

		expect(container).toHaveTextContent('Front of book');
	});
});
