import SwapValueDifference from '$lib/components/swap/SwapValueDifference.svelte';
import { SWAP_CONTEXT_KEY } from '$lib/stores/swap.store';
import { render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('SwapValueDifference', () => {
	const renderComponent = ({
		swapAmount = '100',
		receiveAmount,
		iconPosition,
		sourceTokenExchangeRate = 1,
		destinationTokenExchangeRate = 1
	}: {
		swapAmount?: string | number | undefined;
		receiveAmount?: number;
		iconPosition?: 'right' | 'left';
		sourceTokenExchangeRate?: number;
		destinationTokenExchangeRate?: number;
	} = {}) => {
		const context = new Map();
		context.set(SWAP_CONTEXT_KEY, {
			sourceTokenExchangeRate: readable(sourceTokenExchangeRate),
			destinationTokenExchangeRate: readable(destinationTokenExchangeRate)
		});

		return render(SwapValueDifference, {
			props: {
				swapAmount,
				receiveAmount,
				iconPosition
			},
			context
		});
	};

	it('renders nothing when value difference cannot be calculated', () => {
		const { container } = renderComponent({ receiveAmount: undefined });

		expect(container.querySelectorAll('*')).toHaveLength(0);
		expect(container).toHaveTextContent('');
	});

	it('renders success value when difference is greater than warning threshold', () => {
		const { getByText } = renderComponent({ receiveAmount: 110 });

		const difference = getByText('+10.00%');

		expect(difference).toHaveClass('text-success-primary');
		expect(difference).not.toHaveClass('font-bold');
		expect(difference).not.toHaveTextContent('⚠');
	});

	it('renders warning value with icon for warning-range difference', () => {
		const { getByText } = renderComponent({ receiveAmount: 99 });

		const difference = getByText('-1.00% ⚠');

		expect(difference).toHaveClass('text-warning-primary');
		expect(difference).toHaveClass('font-bold');
	});

	it('renders warning icon before value when iconPosition is left', () => {
		const { getByText } = renderComponent({ receiveAmount: 99, iconPosition: 'left' });

		const difference = getByText('⚠ -1.00%');

		expect(difference).toHaveClass('text-warning-primary');
		expect(difference).toHaveClass('font-bold');
	});

	it('renders error value with icon for error-range difference', () => {
		const { getByText } = renderComponent({ receiveAmount: 95 });

		const difference = getByText('-5.00% ⚠');

		expect(difference).toHaveClass('text-error-primary');
		expect(difference).toHaveClass('font-bold');
	});
});
