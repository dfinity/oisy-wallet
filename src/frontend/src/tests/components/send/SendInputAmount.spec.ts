import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';
import en from '../../mocks/i18n.mock';

describe('SendInputAmount', () => {
	const amount = 10.25;

	const props = {
		amount: amount,
		calculateMax: () => amount * 2
	};

	const inputSelector = 'input[data-tid="amount-input"]';
	const buttonSelector = 'button[data-tid="max-button"]';

	it('should render an input', () => {
		const { container } = render(SendInputAmount, { props });

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		assertNonNullish(input, 'Input not found');

		expect(input?.value).toBe(props.amount.toString());
	});

	it('should render a max button disabled if calculateMax is not provided', () => {
		const { calculateMax: _, ...newProps } = props;
		const { container } = render(SendInputAmount, { props: newProps });

		const button: HTMLButtonElement | null = container.querySelector(
			'button[data-tid="max-button"]'
		);
		expect(button).toBeDisabled();
	});

	it('should render a max button if calculateMax is provided', () => {
		const { container, getByText } = render(SendInputAmount, { props });

		const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
		assertNonNullish(button, 'Max button not found');

		expect(getByText(en.core.text.max)).toBeInTheDocument();
	});

	it('should trigger max value', async () => {
		const { container } = render(SendInputAmount, { props });

		const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
		assertNonNullish(button, 'Max button not found');

		await fireEvent.click(button);

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		expect(input?.value).toBe(props.calculateMax().toString());
	});

	it('should raise an error when the amount is not valid', async () => {
		const { container } = render(SendInputAmount, { props });

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		assertNonNullish(input, 'Input not found');
		expect(input?.value).toBe(props.amount.toString());

		await fireEvent.input(input, { target: { value: 'a' } });
		expect(input?.value).toBe(props.amount.toString());

		await fireEvent.input(input, { target: { value: '-1' } });
		expect(input?.value).toBe(props.amount.toString());
	});
});
