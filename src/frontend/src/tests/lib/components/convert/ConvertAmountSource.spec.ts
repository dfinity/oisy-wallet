import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { BigNumber } from 'alchemy-sdk';
import { readable } from 'svelte/store';

describe('ConvertAmountSource', () => {
	const sendAmount = 20;
	const totalFee = 10000n;
	const exchangeRate = 0.01;
	const defaultBalance = BigNumber.from(5000000n);
	const insufficientFunds = false;
	const insufficientFundsForFee = false;

	const props = {
		sendAmount,
		insufficientFunds,
		insufficientFundsForFee,
		totalFee
	};

	const mockContext = (balance: BigNumber = defaultBalance) =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(BTC_MAINNET_TOKEN),
					sourceTokenBalance: readable(balance),
					sourceTokenExchangeRate: readable(exchangeRate)
				}
			]
		]);

	const amountInfoTestId = 'convert-amount-source-amount-info';
	const balanceTestId = 'convert-amount-source-balance';

	it('should display values correctly without error if insufficientFundsForFee is false', () => {
		const { getByTestId } = render(ConvertAmountSource, {
			props,
			context: mockContext()
		});

		expect(getByTestId(amountInfoTestId)).toHaveTextContent('$0.20');
		expect(getByTestId(balanceTestId)).toHaveTextContent('0.05 BTC');
	});

	it('should display values correctly without error if insufficientFundsForFee is true', async () => {
		const { getByTestId, rerender } = render(ConvertAmountSource, {
			props,
			context: mockContext()
		});

		await rerender({
			...props,
			insufficientFundsForFee: true
		});

		expect(getByTestId(amountInfoTestId)).toHaveTextContent('$0.20');
		expect(getByTestId(balanceTestId)).toHaveTextContent('0.05 BTC');
	});

	it('should display values correctly with error', async () => {
		const { getByTestId, rerender } = render(ConvertAmountSource, {
			props,
			context: mockContext()
		});

		await rerender({
			...props,
			insufficientFunds: true
		});

		expect(getByTestId(amountInfoTestId)).toHaveTextContent(
			en.convert.assertion.insufficient_funds
		);
		expect(getByTestId(balanceTestId)).toHaveTextContent('0.05 BTC');
	});

	it('should set sendAmount correctly on max button click', async () => {
		const { getByTestId, component } = render(ConvertAmountSource, {
			props,
			context: mockContext()
		});

		await fireEvent.click(getByTestId(balanceTestId));

		expect(component.$$.ctx[component.$$.props['sendAmount']]).toBe(0.05);
	});

	it('should not change sendAmount on max button click if balance is zero', async () => {
		const { getByTestId, component } = render(ConvertAmountSource, {
			props,
			context: mockContext(ZERO)
		});

		await fireEvent.click(getByTestId(balanceTestId));

		expect(component.$$.ctx[component.$$.props['sendAmount']]).toBe(props.sendAmount);
	});

	it('should display max button value in a correct format', () => {
		const { getByTestId } = render(ConvertAmountSource, {
			props,
			context: mockContext(BigNumber.from(50000438709n))
		});

		expect(getByTestId(balanceTestId)).toHaveTextContent('Max: 500.00438709 BTC');
	});
});
