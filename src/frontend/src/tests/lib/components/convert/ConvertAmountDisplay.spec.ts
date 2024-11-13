import { BTC_MAINNET_SYMBOL } from '$env/tokens.btc.env';
import ConvertAmountDisplay from '$lib/components/convert/ConvertAmountDisplay.svelte';
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

	const valueTestId = 'convert-amount-display-value';
	const skeletonTestId = 'convert-amount-display-skeleton';

	it('should display correct value if amount is provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, { props });

		expect(getByTestId(valueTestId)).toHaveTextContent('20.25 BTC');
	});

	it('should display zero label if amount is zero and label is provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: { ...props, zeroAmountLabel: 'Free', amount: 0 }
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('Free');
	});

	it('should display zero if amount is zero and label is not provided', () => {
		const { getByTestId } = render(ConvertAmountDisplay, {
			props: { ...props, amount: 0 }
		});

		expect(getByTestId(valueTestId)).toHaveTextContent('0 BTC');
	});

	it('should display skeleton if amount is not provided', () => {
		const { amount: _, ...newProps } = props;
		const { getByTestId } = render(ConvertAmountDisplay, { props: newProps });

		expect(getByTestId(skeletonTestId)).toBeInTheDocument();
	});
});
