import TokenInputAmountExchange from '$lib/components/tokens/TokenInputAmountExchange.svelte';
import {
	TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON,
	TOKEN_INPUT_AMOUNT_EXCHANGE_UNAVAILABLE,
	TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE
} from '$lib/constants/test-ids.constants';
import type { OptionAmount } from '$lib/types/send';
import type { DisplayUnit } from '$lib/types/swap';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('TokenInputAmountExchange', () => {
	const defaultProps = {
		amount: '100' as OptionAmount,
		exchangeRate: 2,
		token: mockValidIcToken,
		displayUnit: 'token' as DisplayUnit
	};

	it('renders token amount when in token mode', () => {
		const { getByTestId } = render(TokenInputAmountExchange, defaultProps);
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent(`100 ${mockValidIcToken.symbol}`);
	});

	it('renders USD amount when in USD mode', () => {
		const { getByTestId } = render(TokenInputAmountExchange, {
			...defaultProps,
			displayUnit: 'usd' as DisplayUnit
		});
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent('$200.00');
	});

	it('switches between token and USD display on button click', async () => {
		const { getByTestId } = render(TokenInputAmountExchange, defaultProps);
		const button = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_BUTTON);
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent(`100 ${mockValidIcToken.symbol}`);

		await fireEvent.click(button);

		expect(valueElement).toHaveTextContent('$200.00');

		await fireEvent.click(button);

		expect(valueElement).toHaveTextContent(`100 ${mockValidIcToken.symbol}`);
	});

	it('shows exchange unavailable message when exchange rate is undefined', () => {
		const { getByTestId } = render(TokenInputAmountExchange, {
			...defaultProps,
			exchangeRate: undefined
		});
		const unavailableElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_UNAVAILABLE);

		expect(unavailableElement).toBeInTheDocument();
	});

	it('handles undefined amount', () => {
		const { getByTestId } = render(TokenInputAmountExchange, {
			...defaultProps,
			amount: undefined
		});
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent(`0 ${mockValidIcToken.symbol}`);
	});

	it('handles undefined token', () => {
		const { getByTestId } = render(TokenInputAmountExchange, {
			...defaultProps
		});
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent('0');
	});

	it('formats USD amount with 2 decimal places', () => {
		const { getByTestId } = render(TokenInputAmountExchange, {
			...defaultProps,
			amount: '123.456789' as OptionAmount,
			displayUnit: 'usd' as DisplayUnit
		});
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent('$246.91');
	});

	it('handles zero amount', () => {
		const { getByTestId } = render(TokenInputAmountExchange, {
			...defaultProps,
			amount: '0' as OptionAmount
		});
		const valueElement = getByTestId(TOKEN_INPUT_AMOUNT_EXCHANGE_VALUE);

		expect(valueElement).toHaveTextContent(`0 ${mockValidIcToken.symbol}`);
	});
});
