import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import ConvertAmountDestination from '$lib/components/convert/ConvertAmountDestination.svelte';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';
import { readable } from 'svelte/store';

describe('ConvertAmountDestination', () => {
	const sendAmount = 20;
	const receiveAmount = sendAmount;
	const exchangeRate = 0.01;
	const balance = BigNumber.from(10000n);
	const insufficientFunds = false;

	const props = {
		sendAmount,
		insufficientFunds
	};

	const mockContext = new Map([
		[
			CONVERT_CONTEXT_KEY,
			{
				destinationToken: readable(BTC_MAINNET_TOKEN),
				destinationTokenBalance: readable(balance),
				destinationTokenExchangeRate: readable(exchangeRate)
			}
		]
	]);

	const amountInfoTestId = 'convert-amount-destination-amount-info';
	const balanceTestId = 'convert-amount-destination-balance';

	it('should display values correctly', () => {
		const { getByTestId } = render(ConvertAmountDestination, {
			props,
			context: mockContext
		});

		expect(getByTestId(amountInfoTestId)).toHaveTextContent('$0.20');
		expect(getByTestId(balanceTestId)).toHaveTextContent('0.0001 BTC');
	});

	it('should calculate receiveAmount correctly', () => {
		const { component } = render(ConvertAmountDestination, {
			props,
			context: mockContext
		});

		expect(component.$$.ctx[component.$$.props['receiveAmount']]).toBe(receiveAmount);
	});

	it('should calculate receiveAmount correctly if sendAmount is not provided', () => {
		const { sendAmount: _, ...newProps } = props;
		const { component } = render(ConvertAmountDestination, {
			props: newProps,
			context: mockContext
		});

		expect(component.$$.ctx[component.$$.props['receiveAmount']]).toBeUndefined();
	});

	it('should calculate receiveAmount correctly if insufficientFunds is true', () => {
		const { component } = render(ConvertAmountDestination, {
			props: { ...props, insufficientFunds: true },
			context: mockContext
		});

		expect(component.$$.ctx[component.$$.props['receiveAmount']]).toBeUndefined();
	});
});
