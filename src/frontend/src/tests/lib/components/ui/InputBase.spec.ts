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

	it('should be required by default and optional when disabled', () => {
		const { container: required } = render(InputBase, { props });

		expect(input(required)?.hasAttribute('required')).toBeTruthy();

		const { container: optional } = render(InputBase, { props: { ...props, required: false } });

		expect(input(optional)?.hasAttribute('required')).toBeFalsy();
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

	it('should render the label/info row via snippets', () => {
		const { getByTestId } = render(InputBaseTest, { props });

		expect(getByTestId('label-slot')).toBeInTheDocument();
	});

	it('should render the bottom slot when provided', () => {
		const { getByTestId } = render(InputBaseTest, { props });

		expect(getByTestId('bottom-slot')).toBeInTheDocument();
	});
});
