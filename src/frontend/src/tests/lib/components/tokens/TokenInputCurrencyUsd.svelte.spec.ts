import TokenInputCurrencyFiat from '$lib/components/tokens/TokenInputCurrencyFiat.svelte';
import {
	TOKEN_INPUT_CURRENCY_FIAT,
	TOKEN_INPUT_CURRENCY_FIAT_SYMBOL
} from '$lib/constants/test-ids.constants';
import type { OptionAmount } from '$lib/types/send';
import { fireEvent, render } from '@testing-library/svelte';

describe('TokenInputCurrencyFiat', () => {
	const defaultProps = {
		tokenAmount: undefined as OptionAmount,
		tokenDecimals: 6,
		exchangeRate: 2,
		disabled: false,
		placeholder: '0',
		error: false,
		loading: false
	};

	it('renders in USD mode with $ sign', () => {
		const { getByTestId } = render(TokenInputCurrencyFiat, defaultProps);

		expect(getByTestId(TOKEN_INPUT_CURRENCY_FIAT_SYMBOL)).toHaveTextContent('$');
	});

	it('converts token value to USD display value', () => {
		const props = {
			...defaultProps,
			tokenAmount: '100' as OptionAmount,
			exchangeRate: 2
		};

		const { getByTestId } = render(TokenInputCurrencyFiat, props);
		const input = getByTestId(TOKEN_INPUT_CURRENCY_FIAT);

		expect(input).toHaveValue('200.00');
	});

	it('handles null/undefined values', async () => {
		const { getByTestId } = render(TokenInputCurrencyFiat, defaultProps);
		const input = getByTestId(TOKEN_INPUT_CURRENCY_FIAT);

		await fireEvent.input(input, { target: { value: '' } });

		expect(input).toHaveValue('');
	});

	it.each(['10000', '1000', '100'])('does not format usd value %s', async (value) => {
		const { getByTestId } = render(TokenInputCurrencyFiat, defaultProps);
		const input = getByTestId(TOKEN_INPUT_CURRENCY_FIAT);

		await fireEvent.input(input, { target: { value } });

		expect(input).toHaveValue(value);
	});

	it('updates display value when tokenAmount changes', async () => {
		const testProps = $state({
			...defaultProps,
			tokenAmount: '123.456789' as OptionAmount
		});

		const { getByTestId } = render(TokenInputCurrencyFiat, { props: testProps });
		const input = getByTestId(TOKEN_INPUT_CURRENCY_FIAT);

		expect(input).toHaveValue('246.91');

		testProps.tokenAmount = '200';

		await vi.waitFor(() => expect(input).toHaveValue('400.00'));
	});
});
