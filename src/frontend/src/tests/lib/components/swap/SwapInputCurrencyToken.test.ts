import SwapInputCurrencyToken from '$lib/components/swap/SwapInputCurrencyToken.svelte';
import { SWAP_INPUT_CURRENCY_TOKEN } from '$lib/constants/test-ids.constants';
import type { OptionAmount } from '$lib/types/send';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('SwapInputCurrency', () => {
	const defaultProps = {
		value: undefined as OptionAmount,
		decimals: 6,
		disabled: false,
		placeholder: '0',
		error: false,
		loading: false
	};

	it('handles input', async () => {
		const { getByTestId } = render(SwapInputCurrencyToken, defaultProps);
		const input = getByTestId(SWAP_INPUT_CURRENCY_TOKEN);

		await fireEvent.input(input, { target: { value: '100' } });
		expect(input).toHaveValue('100');
	});

	it('handles null/undefined values', async () => {
		const { getByTestId } = render(SwapInputCurrencyToken, defaultProps);
		const input = getByTestId(SWAP_INPUT_CURRENCY_TOKEN);

		await fireEvent.input(input, { target: { value: '' } });
		expect(input).toHaveValue('');
	});

	it('uses correct decimal places', () => {
		const props = {
			...defaultProps,
			decimals: 6,
			value: '123.456789' as OptionAmount
		};

		const { getByTestId } = render(SwapInputCurrencyToken, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY_TOKEN);

		expect(input).toHaveValue('123.456789');
	});
});
