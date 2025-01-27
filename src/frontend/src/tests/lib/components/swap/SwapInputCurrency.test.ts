import SwapInputCurrency from '$lib/components/swap/SwapInputCurrency.svelte';
import {
	SWAP_INPUT_CURRENCY,
	SWAP_INPUT_CURRENCY_USD_SYMBOL
} from '$lib/constants/test-ids.constants';
import type { OptionAmount } from '$lib/types/send';
import type { DisplayUnit } from '$lib/types/swap';
import { fireEvent, render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

describe('SwapInputCurrency', () => {
	const defaultProps = {
		value: undefined as OptionAmount,
		displayUnit: 'token' as DisplayUnit,
		exchangeRate: 2,
		decimals: 6,
		name: 'swap-amount',
		disabled: false,
		placeholder: '0',
		error: false,
		loading: false
	};

	it('renders in USD mode with $ sign', () => {
		const { getByTestId } = render(SwapInputCurrency, {
			...defaultProps,
			displayUnit: 'usd' as DisplayUnit
		});
		expect(getByTestId(SWAP_INPUT_CURRENCY_USD_SYMBOL)).toHaveTextContent('$');
	});

	it('converts token value to USD when switching to USD display unit', async () => {
		const props = {
			...defaultProps,
			value: '100' as OptionAmount,
			exchangeRate: 2
		};

		const { getByTestId, component } = render(SwapInputCurrency, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY);

		expect(input).toHaveValue('100');

		await component.$set({ displayUnit: 'usd' as DisplayUnit });

		expect(input).toHaveValue('200.00');
	});

	it('converts USD value to tokens when switching to token display unit', async () => {
		const props = {
			...defaultProps,
			value: '100' as OptionAmount,
			displayUnit: 'usd' as DisplayUnit,
			exchangeRate: 2
		};

		const { getByTestId, component } = render(SwapInputCurrency, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY);

		expect(input).toHaveValue('200.00');

		await component.$set({ displayUnit: 'token' as DisplayUnit });

		expect(input).toHaveValue('100');
	});

	it('handles input in token mode', async () => {
		const { getByTestId } = render(SwapInputCurrency, defaultProps);
		const input = getByTestId(SWAP_INPUT_CURRENCY);

		await fireEvent.input(input, { target: { value: '100' } });
		expect(input).toHaveValue('100');
	});

	it('handles input in USD mode with conversion', async () => {
		const props = {
			...defaultProps,
			displayUnit: 'usd' as DisplayUnit,
			exchangeRate: 2
		};

		const { getByTestId } = render(SwapInputCurrency, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY);

		await fireEvent.input(input, { target: { value: '200' } });

		expect(input).toHaveValue('200');
	});

	it('handles null/undefined values', async () => {
		const { getByTestId } = render(SwapInputCurrency, defaultProps);
		const input = getByTestId(SWAP_INPUT_CURRENCY);

		await fireEvent.input(input, { target: { value: '' } });
		expect(input).toHaveValue('');
	});

	it('uses correct decimal places (2 for USD, custom for tokens)', async () => {
		const props = {
			...defaultProps,
			decimals: 6,
			value: '123.456789' as OptionAmount
		};

		const { getByTestId, component } = render(SwapInputCurrency, props);
		const input = getByTestId(SWAP_INPUT_CURRENCY);

		expect(input).toHaveValue('123.456789');

		await component.$set({ displayUnit: 'usd' as DisplayUnit });
		expect(input).toHaveValue('246.91');
	});
});
