import SendInputAmount from '$lib/components/send/SendInputAmount.svelte';
import en from '$tests/mocks/i18n.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

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

	it('should imperatively trigger max value', async () => {
		const { container, component } = render(SendInputAmount, { props });

		component.$$.ctx[component.$$.props['triggerCalculateMax']]();

		await waitFor(() => {
			const input: HTMLInputElement | null = container.querySelector(inputSelector);
			expect(input?.value).toBe(props.calculateMax().toString());
		});
	});

	it('should imperatively trigger validation', async () => {
		const customValidate = vi.fn();

		const { component } = render(SendInputAmount, {
			props: {
				...props,
				customValidate
			}
		});

		await waitFor(() => {
			expect(customValidate).toHaveBeenCalledTimes(1);
		});

		component.$$.ctx[component.$$.props['triggerValidate']]();

		await waitFor(() => {
			expect(customValidate).toHaveBeenCalledTimes(2);
		});
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

	describe('amountSetToMax', () => {
		const renderSetAndAssertMax = async (): Promise<{
			container: HTMLElement;
			component: SendInputAmount;
		}> => {
			const { container, component } = render(SendInputAmount, { props });

			expect(component.$$.ctx[component.$$.props['amountSetToMax']]).toBeFalsy();

			const button: HTMLButtonElement | null = container.querySelector(buttonSelector);
			assertNonNullish(button, 'Max button not found');

			await fireEvent.click(button);

			expect(component.$$.ctx[component.$$.props['amountSetToMax']]).toBeTruthy();

			return { component, container };
		};

		it('should expose a truthy amountSetToMax property when max value was triggered', async () => {
			await renderSetAndAssertMax();
		});

		it('should reset amountSetToMax when max value was triggered but amount was manually updated afterwards', async () => {
			const { container, component } = await renderSetAndAssertMax();

			const input: HTMLInputElement | null = container.querySelector(inputSelector);
			assertNonNullish(input, 'Input not found');
			await fireEvent.input(input, { target: { value: '0.1' } });

			expect(component.$$.ctx[component.$$.props['amountSetToMax']]).toBeFalsy();
		});
	});
});
