import TokenInputCurrencyToken from '$lib/components/tokens/TokenInputCurrencyToken.svelte';
import { TOKEN_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import type { OptionAmount } from '$lib/types/send';
import { fireEvent, render } from '@testing-library/svelte';

describe('TokenInputCurrencyToken', () => {
	const defaultProps = {
		value: undefined as OptionAmount,
		decimals: 6,
		disabled: false,
		placeholder: '0',
		error: false,
		loading: false
	};

	it('handles input', async () => {
		const { getByTestId } = render(TokenInputCurrencyToken, defaultProps);
		const input = getByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		await fireEvent.input(input, { target: { value: '100' } });

		expect(input).toHaveValue('100');
	});

	it('handles null/undefined values', async () => {
		const { getByTestId } = render(TokenInputCurrencyToken, defaultProps);
		const input = getByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		await fireEvent.input(input, { target: { value: '' } });

		expect(input).toHaveValue('');
	});

	it('uses correct decimal places', () => {
		const props = {
			...defaultProps,
			decimals: 6,
			value: '123.456789' as OptionAmount
		};

		const { getByTestId } = render(TokenInputCurrencyToken, props);
		const input = getByTestId(TOKEN_INPUT_CURRENCY_TOKEN);

		expect(input).toHaveValue('123.456789');
	});
});
