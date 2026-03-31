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
		const { container } = renderComponent({ receiveAmount: 110 });
		const difference = container.querySelector('span.inline-flex');

		expect(difference).toBeTruthy();
		expect(difference).toHaveClass('text-success-primary');
		expect(difference).not.toHaveClass('font-bold');
		expect(difference).not.toHaveTextContent('⚠');
		expect(difference).toHaveTextContent('+10.00%');
	});

	it('renders warning value with icon for warning-range difference', () => {
		const { container } = renderComponent({ receiveAmount: 99 });
		const difference = container.querySelector('span.inline-flex');

		expect(difference).toBeTruthy();
		expect(difference).toHaveClass('text-warning-primary');
		expect(difference).toHaveClass('font-bold');
		expect(difference).toHaveTextContent(/-1\.00%\s*⚠/);
		expect(difference?.firstElementChild).toHaveTextContent('-1.00%');
		expect(difference?.lastElementChild).toHaveTextContent('⚠');
	});

	it('renders warning icon before value when iconPosition is left', () => {
		const { container } = renderComponent({ receiveAmount: 99, iconPosition: 'left' });
		const difference = container.querySelector('span.inline-flex');

		expect(difference).toBeTruthy();
		expect(difference).toHaveClass('text-warning-primary');
		expect(difference).toHaveClass('font-bold');
		expect(difference).toHaveTextContent(/⚠\s*-1\.00%/);
		expect(difference?.firstElementChild).toHaveTextContent('⚠');
		expect(difference?.lastElementChild).toHaveTextContent('-1.00%');
	});

	it('renders error value with icon for error-range difference', () => {
		const { container } = renderComponent({ receiveAmount: 95 });
		const difference = container.querySelector('span.inline-flex');

		expect(difference).toBeTruthy();
		expect(difference).toHaveClass('text-error-primary');
		expect(difference).toHaveClass('font-bold');
		expect(difference).toHaveTextContent(/-5\.00%\s*⚠/);
		expect(difference?.firstElementChild).toHaveTextContent('-5.00%');
		expect(difference?.lastElementChild).toHaveTextContent('⚠');
	});
});
