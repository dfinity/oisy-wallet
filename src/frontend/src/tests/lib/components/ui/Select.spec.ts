import SelectTest from '$tests/lib/components/ui/SelectTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('Select', () => {
	const options = [
		{ label: '1', value: '1' },
		{ label: '2', value: '2' },
		{ label: '3', value: '3' },
		{ label: '4', value: '4' },
		{ label: '5', value: '5' }
	];
	const props = { options };

	it('should render a select', () => {
		const { container } = render(SelectTest, { props });

		expect(container.querySelector('select')).toBeInTheDocument();
	});

	it('should render an option per SelectOption', () => {
		const { container } = render(SelectTest, { props });

		const renderedOptions = container.querySelectorAll('select option');

		expect(renderedOptions).toHaveLength(options.length);
		expect(Array.from(renderedOptions).map((option) => option.textContent?.trim())).toEqual(
			options.map(({ label }) => label)
		);
	});

	it('should change value', () => {
		const { container } = render(SelectTest, { props });

		const selectElement = container.querySelector('select');

		expect(selectElement?.value).toBe(options[0].value);

		selectElement && fireEvent.change(selectElement, { target: { value: options[4].value } });

		expect(selectElement?.value).toBe(options[4].value);
	});

	it('should allow setting an initial value', () => {
		const value = options.at(2)?.value;
		const { container } = render(SelectTest, { props: { ...props, value } });

		expect(container.querySelector('select')?.value).toBe(value);
	});

	it('should reflect a bound value change', async () => {
		const { getByTestId, container } = render(SelectTest, { props });

		const selectElement = container.querySelector('select');

		expect(selectElement?.value).toBe('1');

		await fireEvent.click(getByTestId('test'));

		expect(selectElement?.value).toBe('3');
	});
});
