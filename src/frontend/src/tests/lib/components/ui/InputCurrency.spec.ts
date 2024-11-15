import InputCurrency from '$lib/components/ui/InputCurrency.svelte';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('ConvertAmountExchange', () => {
	const inputTestId = 'input-currency';
	const props = {
		name: 'input',
		placeholder: 'placeholder',
		testId: inputTestId
	};

	const inputSelector = `input[data-tid=${inputTestId}]`;

	it('should be empty if no value is provided', () => {
		const { container, component } = render(InputCurrency, { props });

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		assertNonNullish(input, 'Input not found');

		expect(input?.value).toBe('');
		expect(component.$$.ctx[component.$$.props['value']]).toBeUndefined();
	});

	it('should display correct value if it is provided', () => {
		const { container, component } = render(InputCurrency, {
			props: {
				...props,
				value: 10
			}
		});

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		assertNonNullish(input, 'Input not found');

		expect(input?.value).toBe('10');
		expect(component.$$.ctx[component.$$.props['value']]).toBe(10);
	});

	it('should display and update value prop on input correctly', async () => {
		const { container, component } = render(InputCurrency, props);

		const input: HTMLInputElement | null = container.querySelector(inputSelector);
		assertNonNullish(input, 'Input not found');

		await fireEvent.input(input, { target: { value: '10' } });
		expect(input?.value).toBe('10');
		expect(component.$$.ctx[component.$$.props['value']]).toBe(10);

		await fireEvent.input(input, { target: { value: '' } });
		expect(input?.value).toBe('');
		expect(component.$$.ctx[component.$$.props['value']]).toBe(undefined);
	});
});
