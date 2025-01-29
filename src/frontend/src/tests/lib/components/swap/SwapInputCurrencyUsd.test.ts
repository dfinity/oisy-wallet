import SwapInputCurrencyUsd from '$lib/components/swap/SwapInputCurrencyUsd.svelte';
import {
	SWAP_INPUT_CURRENCY_USD,
	SWAP_INPUT_CURRENCY_USD_SYMBOL
} from '$lib/constants/test-ids.constants';
import type { OptionAmount } from '$lib/types/send';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('SwapInputCurrencyUsd', () => {
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
		const { getByTestId } = render(SwapInputCurrencyUsd, defaultProps);
		expect(getByTestId(SWAP_INPUT_CURRENCY_USD_SYMBOL)).toHaveTextContent('$');
	});

	it('converts token value to USD display value', () => {
		const props = {
			...defaultProps,
			tokenAmount: '100' as OptionAmount,
			exchangeRate: 2
		};

		const { getByTestId } = render(SwapInputCurrencyUsd, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY_USD);

		expect(input).toHaveValue('200.00');
	});

	it('handles null/undefined values', async () => {
		const { getByTestId } = render(SwapInputCurrencyUsd, defaultProps);
		const input = getByTestId(SWAP_INPUT_CURRENCY_USD);

		await fireEvent.input(input, { target: { value: '' } });
		expect(input).toHaveValue('');
	});

	it('updates display value when tokenAmount changes', async () => {
		const props = {
			...defaultProps,
			tokenAmount: '123.456789' as OptionAmount
		};

		const { getByTestId, component } = render(SwapInputCurrencyUsd, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY_USD);

		expect(input).toHaveValue('246.91');

		await component.$set({ tokenAmount: '200' as OptionAmount });
		expect(input).toHaveValue('400.00');
	});
});
