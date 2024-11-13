import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
import { render } from '@testing-library/svelte';

describe('ConvertAmountExchange', () => {
	const amount = 20.25;
	const exchangeRate = 0.01;

	const props = {
		amount,
		exchangeRate
	};

	const divTestId = 'convert-amount-exchange';
	const skeletonTestId = 'convert-amount-exchange-skeleton';

	it('should display correct value if amount is provided', () => {
		const { getByTestId } = render(ConvertAmountExchange, { props });

		expect(getByTestId(divTestId)).toHaveTextContent('~$0.20');
	});

	it('should display correct value if amount is zero', () => {
		const { getByTestId } = render(ConvertAmountExchange, {
			props: { ...props, amount: 0 }
		});

		expect(getByTestId(divTestId)).toHaveTextContent('$0.00');
	});

	it('should display skeleton if amount is not provided', () => {
		const { amount: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountExchange, { props: newProps });

		expect(getByTestId(skeletonTestId)).toBeInTheDocument();
	});

	it('should display skeleton if exchange rate is not provided', () => {
		const { exchangeRate: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountExchange, { props: newProps });

		expect(getByTestId(skeletonTestId)).toBeInTheDocument();
	});
});
