import InputBase from '$lib/components/ui/InputBase.svelte';
import InputBaseTest from '$tests/lib/components/ui/InputBaseTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('InputBase', () => {
	const props = { name: 'name', placeholder: 'test.placeholder' };

	const input = (container: HTMLElement): HTMLInputElement | null =>
		container.querySelector('input');

	it('should render an input', () => {
		const { container } = render(InputBase, { props });

		expect(input(container)).not.toBeNull();
	});

	it('should render the placeholder', () => {
		const { container } = render(InputBase, { props });

		expect(input(container)?.getAttribute('placeholder')).toBe('test.placeholder');
	});

	it('should default to a number input', () => {
		const { container } = render(InputBase, { props });

		expect(input(container)?.getAttribute('type')).toBe('number');
	});

	it('should render a text input', () => {
		const { container } = render(InputBase, { props: { ...props, inputType: 'text' } });

		expect(input(container)?.getAttribute('type')).toBe('text');
	});

	it('should render a currency input as text', () => {
		const { container } = render(InputBase, { props: { ...props, inputType: 'currency' } });

		expect(input(container)?.getAttribute('type')).toBe('text');
	});

	it.each(['currency', 'icp'] as const)(
		'should open the decimal keypad for %s inputs',
		(inputType) => {
			const { container } = render(InputBase, { props: { ...props, inputType } });

			expect(input(container)?.getAttribute('inputmode')).toBe('decimal');
		}
	);

	it.each(['number', 'text'] as const)('should not set an inputmode for %s inputs', (inputType) => {
		const { container } = render(InputBase, { props: { ...props, inputType } });

		expect(input(container)?.hasAttribute('inputmode')).toBeFalsy();
	});

	it('should be required by default and optional when required is false', () => {
		const { container: required } = render(InputBase, { props });

		expect(input(required)?.hasAttribute('required')).toBeTruthy();

		const { container: optional } = render(InputBase, { props: { ...props, required: false } });

		expect(input(optional)?.hasAttribute('required')).toBeFalsy();
	});

	it('should link the input to its description only when one is given', () => {
		const { container: described } = render(InputBase, {
			props: { ...props, ariaDescribedBy: 'my-hint' }
		});

		expect(input(described)?.getAttribute('aria-describedby')).toBe('my-hint');

		const { container: plain } = render(InputBase, { props });

		expect(input(plain)?.hasAttribute('aria-describedby')).toBeFalsy();
	});

	it('should render a disabled input', () => {
		const { container } = render(InputBase, { props: { ...props, disabled: true } });

		expect(input(container)?.hasAttribute('disabled')).toBeTruthy();
	});

	it('should set the test id', () => {
		const { container } = render(InputBase, { props: { ...props, testId: 'my-input' } });

		expect(input(container)?.getAttribute('data-tid')).toBe('my-input');
	});

	it('should update the value on text input', async () => {
		const { container } = render(InputBase, { props: { ...props, inputType: 'text' } });

		const element = input(container);
		element && (await fireEvent.input(element, { target: { value: 'hello' } }));

		expect(element?.value).toBe('hello');
	});

	it('should reject a currency value with too many decimals', async () => {
		const { container } = render(InputBase, {
			props: { ...props, inputType: 'currency', decimals: 2, value: '1.5' }
		});

		const element = input(container);
		// 3 decimals exceeds the 2 allowed → the invalid entry is rejected and the last valid value restored.
		element && (await fireEvent.input(element, { target: { value: '1.999' } }));

		expect(element?.value).toBe('1.5');
	});

	it('should read a comma as the decimal separator of a currency value', async () => {
		let value: string | number | undefined;

		const { container } = render(InputBase, {
			props: {
				...props,
				inputType: 'currency',
				// Stands in for `bind:value`, so the test sees the value the input hands back.
				get value() {
					return value;
				},
				set value(next) {
					value = next;
				}
			}
		});

		const element = input(container);
		element && (await fireEvent.input(element, { target: { value: '1,5' } }));

		expect(element?.value).toBe('1.5');
		expect(value).toBe('1.5');
	});

	it('should keep the cursor after a comma typed inside a currency value', async () => {
		const { container } = render(InputBase, {
			props: { ...props, inputType: 'currency', value: '15' }
		});

		const element = input(container);
		// Types "," between "1" and "5", leaving the cursor after it.
		element?.setRangeText(',', 1, 1, 'end');
		element && (await fireEvent.input(element));

		expect(element?.value).toBe('1.5');
		expect(element?.selectionStart).toBe(2);
	});

	it('should reject a comma value with too many decimals', async () => {
		const { container } = render(InputBase, {
			props: { ...props, inputType: 'currency', decimals: 2, value: '1.5' }
		});

		const element = input(container);
		element && (await fireEvent.input(element, { target: { value: '1,999' } }));

		expect(element?.value).toBe('1.5');
	});

	// Both mean 1234.5 in their locale; which mark is the decimal one is refused rather than guessed.
	it.each(['1,234.5', '1.234,5'])(
		'should reject the currency value %s with both a comma and a dot',
		async (text) => {
			const { container } = render(InputBase, {
				props: { ...props, inputType: 'currency', value: '1.5' }
			});

			const element = input(container);
			element && (await fireEvent.input(element, { target: { value: text } }));

			expect(element?.value).toBe('1.5');
		}
	);

	it('should render the label/info row via snippets', () => {
		const { getByTestId } = render(InputBaseTest, { props });

		expect(getByTestId('label-slot')).toBeInTheDocument();
	});

	it('should render the bottom slot when provided', () => {
		const { getByTestId } = render(InputBaseTest, { props });

		expect(getByTestId('bottom-slot')).toBeInTheDocument();
	});
});
