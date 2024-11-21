import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import ConvertInputAmount from '$lib/components/convert/ConvertInputAmount.svelte';
import { parseToken } from '$lib/utils/parse.utils';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('ConvertInputAmount', () => {
	const amount = 20.25;

	const props = {
		token: BTC_MAINNET_TOKEN,
		amount
	};

	const inputSelector = 'input[data-tid="convert-amount"]';
	const resetButtonSelector = 'button[data-tid="convert-amount-reset"]';

	it('should render an input', () => {
		const { container } = render(ConvertInputAmount, { props });

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		assertNonNullish(input, 'Input not found');

		expect(input?.value).toBe(props.amount.toString());
	});

	it('should render the reset button if amount is provided', () => {
		const { container } = render(ConvertInputAmount, { props: props });

		const resetButton: HTMLButtonElement | null = container.querySelector(resetButtonSelector);
		expect(resetButton).toBeInTheDocument();
	});

	it('should not render the reset button if amount is undefined', () => {
		const { amount: _, ...newProps } = props;
		const { container } = render(ConvertInputAmount, { props: newProps });

		const resetButton: HTMLButtonElement | null = container.querySelector(resetButtonSelector);
		expect(resetButton).not.toBeInTheDocument();
	});

	it('should not render the reset button if input is disabled', () => {
		const newProps = { ...props, disabled: true };
		const { container } = render(ConvertInputAmount, { props: newProps });

		const resetButton: HTMLButtonElement | null = container.querySelector(resetButtonSelector);
		expect(resetButton).not.toBeInTheDocument();
	});

	it('should reset input value', async () => {
		const { container, component } = render(ConvertInputAmount, { props });

		const resetButton: HTMLButtonElement | null = container.querySelector(resetButtonSelector);
		assertNonNullish(resetButton, 'Reset button not found');

		await fireEvent.click(resetButton);

		const input: HTMLInputElement | null = container.querySelector(inputSelector);

		expect(input?.value).toBe('');
		expect(component.$$.ctx[component.$$.props['amount']]).toBeUndefined();
	});

	it('should trigger validation', async () => {
		const customValidate = vi.fn();

		render(ConvertInputAmount, {
			props: {
				...props,
				customValidate
			}
		});

		await waitFor(() => {
			expect(customValidate).toHaveBeenCalledTimes(1);
			expect(customValidate).toHaveBeenCalledWith(
				parseToken({
					value: `${amount}`,
					unitName: BTC_MAINNET_TOKEN.decimals
				})
			);
		});
	});
});
