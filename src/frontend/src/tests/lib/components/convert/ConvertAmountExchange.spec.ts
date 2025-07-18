import ConvertAmountExchange from '$lib/components/convert/ConvertAmountExchange.svelte';
import {
	CONVERT_AMOUNT_EXCHANGE_SKELETON,
	CONVERT_AMOUNT_EXCHANGE_VALUE
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('ConvertAmountExchange', () => {
	const amount = 20.25;
	const exchangeRate = 0.01;

	const props = {
		amount,
		exchangeRate
	};

	const divTestId = CONVERT_AMOUNT_EXCHANGE_VALUE;
	const skeletonTestId = CONVERT_AMOUNT_EXCHANGE_SKELETON;

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

	it('should display correct value if amount is less than placeholder value', () => {
		const { getByTestId } = render(ConvertAmountExchange, {
			props: { ...props, amount: 0.00001 }
		});

		expect(getByTestId(divTestId)).toHaveTextContent('< $0.01');
	});

	it('should display skeleton if amount is not provided', () => {
		const { amount: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountExchange, { props: newProps });

		expect(getByTestId(skeletonTestId)).toBeInTheDocument();
	});

	it('should not display skeleton if exchange rate is not provided', () => {
		const { exchangeRate: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountExchange, { props: newProps });

		expect(() => getByTestId(skeletonTestId)).toThrow();
	});
});
