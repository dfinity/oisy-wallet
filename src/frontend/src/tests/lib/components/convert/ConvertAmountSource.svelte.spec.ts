import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import ConvertAmountSource from '$lib/components/convert/ConvertAmountSource.svelte';
import { ZERO } from '$lib/constants/app.constants';
import { TOKEN_INPUT_AMOUNT_EXCHANGE } from '$lib/constants/test-ids.constants';
import { CONVERT_CONTEXT_KEY } from '$lib/stores/convert.store';
import { TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY } from '$lib/stores/token-action-validation-errors.store';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('ConvertAmountSource', () => {
	const sendAmount = 20;
	const totalFee = 10000n;
	const exchangeRate = 0.01;
	const defaultBalance = 5000000n;
	const insufficientFunds = false;
	const insufficientFundsForFee = false;
	// balance - total fee
	const maxButtonValue = '0.0499';
	const maxButtonText = `Max: ${maxButtonValue} BTC`;

	const props = {
		sendAmount,
		insufficientFunds,
		insufficientFundsForFee,
		totalFee
	};

	const mockContext = (balance: bigint = defaultBalance) =>
		new Map([
			[
				CONVERT_CONTEXT_KEY,
				{
					sourceToken: readable(BTC_MAINNET_TOKEN),
					sourceTokenBalance: readable(balance),
					sourceTokenExchangeRate: readable(exchangeRate)
				}
			],
			[TOKEN_ACTION_VALIDATION_ERRORS_CONTEXT_KEY, { setErrorType: () => {} }]
		]);

	const balanceTestId = 'convert-amount-source-balance';

	it('should display values correctly without error if insufficientFundsForFee is false', () => {
		const { getByTestId } = render(ConvertAmountSource, {
			props,
			context: mockContext()
		});

		expect(getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE)).toHaveTextContent('$0.20');
		expect(getByTestId(balanceTestId)).toHaveTextContent(maxButtonText);
	});

	it.each([
		{ type: 'insufficientFunds' },
		{ type: 'insufficientFundsForFee' },
		{ type: 'amountLessThanLedgerFee' },
		{ type: 'minimumAmountNotReached' },
		{ type: 'unknownMinimumAmount' },
		{ type: 'minterInfoNotCertified' }
	])('should display values correctly with $type error', async ({ type }) => {
		const { getByTestId, rerender } = render(ConvertAmountSource, {
			props,
			context: mockContext()
		});

		await rerender({
			...props,
			[type]: true
		});

		expect(getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE)).toHaveTextContent('$0.20');
		expect(getByTestId(balanceTestId)).toHaveTextContent(maxButtonText);
	});

	it('should display loading text if total fee is not available yet', () => {
		const { getByTestId } = render(ConvertAmountSource, {
			props: {
				...props,
				totalFee: undefined
			},
			context: mockContext()
		});

		expect(getByTestId(balanceTestId)).toHaveTextContent(en.convert.text.calculating_max_amount);
	});

	it('should update sendAmount value if max button was clicked and total fee got updated', async () => {
		const testProps = $state(props);

		const { getByTestId, rerender } = render(ConvertAmountSource, {
			props: testProps,
			context: mockContext()
		});

		await fireEvent.click(getByTestId(balanceTestId));

		expect(testProps.sendAmount).toBe(maxButtonValue);

		await rerender({
			totalFee: 9000n
		});

		// wait for debounced setMax to be completed
		await new Promise((resolve) => setTimeout(resolve, 1000));

		expect(testProps.sendAmount).toBe('0.04991');
	});

	it('should not update sendAmount value if max button was not clicked and total fee got updated', async () => {
		const testProps = $state(props);

		const { rerender } = render(ConvertAmountSource, {
			props: testProps,
			context: mockContext()
		});

		expect(testProps.sendAmount).toBe(props.sendAmount);

		await rerender({
			totalFee: 9000n
		});

		// wait for debounced setMax to be completed
		await new Promise((resolve) => setTimeout(resolve, 1000));

		expect(testProps.sendAmount).toBe(props.sendAmount);
	});

	it('should set sendAmount correctly on max button click', async () => {
		const testProps = $state(props);

		const { getByTestId } = render(ConvertAmountSource, {
			props: testProps,
			context: mockContext()
		});

		await fireEvent.click(getByTestId(balanceTestId));

		expect(testProps.sendAmount).toBe(maxButtonValue);
	});

	it('should not change sendAmount on max button click if balance is zero', async () => {
		const testProps = $state(props);

		const { getByTestId } = render(ConvertAmountSource, {
			props: testProps,
			context: mockContext(ZERO)
		});

		await fireEvent.click(getByTestId(balanceTestId));

		expect(testProps.sendAmount).toBe(props.sendAmount);
	});

	it('should display max button value in a correct format', () => {
		const { getByTestId } = render(ConvertAmountSource, {
			props,
			context: mockContext(50000438709n)
		});

		// balance - total fee
		expect(getByTestId(balanceTestId)).toHaveTextContent('Max: 500.00428709 BTC');
	});
});
