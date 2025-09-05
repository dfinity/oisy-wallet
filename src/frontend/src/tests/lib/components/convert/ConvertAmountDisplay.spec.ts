import { BTC_MAINNET_SYMBOL } from '$env/tokens/tokens.btc.env';
import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
import {
	CONVERT_AMOUNT_DISPLAY_SKELETON,
	CONVERT_AMOUNT_DISPLAY_VALUE,
	CONVERT_AMOUNT_EXCHANGE_SKELETON,
	CONVERT_AMOUNT_EXCHANGE_VALUE
} from '$lib/constants/test-ids.constants';
import { render } from '@testing-library/svelte';

describe('ConvertAmountDisplay', () => {
	const amount = 20.25;
	const exchangeRate = 0.01;
	const symbol = BTC_MAINNET_SYMBOL;

	const props = {
		amount,
		exchangeRate,
		symbol
	};

	const valueTestId = CONVERT_AMOUNT_DISPLAY_VALUE;
	const skeletonTestId = CONVERT_AMOUNT_DISPLAY_SKELETON;
	const exchangeSkeleton = CONVERT_AMOUNT_EXCHANGE_SKELETON;
	const exchangeValue = CONVERT_AMOUNT_EXCHANGE_VALUE;

	it('should display correct values if amount is provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, { props });

		expect(getByTestId(valueTestId)).toHaveTextContent('20.25 BTC');
		expect(getByTestId(exchangeValue)).toHaveTextContent('$0.20');
	});

	it('should display zero label if amount is zero and label is provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: { ...props, zeroAmountLabel: 'Free', amount: 0 }
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('Free');
		expect(getByTestId(exchangeValue)).toHaveTextContent('$0.00');
	});

	it('should display zero if amount is zero and label is not provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: { ...props, amount: 0 }
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('0 BTC');
		expect(getByTestId(exchangeValue)).toHaveTextContent('$0.00');
	});

	it('should display skeletons if amount is not provided', () => {
		const { amount: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountDisplay, { props: newProps });

		expect(getByTestId(skeletonTestId)).toBeInTheDocument();
		expect(getByTestId(exchangeSkeleton)).toBeInTheDocument();
	});
});
