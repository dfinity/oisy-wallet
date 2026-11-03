import ListItemCheckboxTest from '$tests/lib/components/common/ListItemCheckboxTest.svelte';
import { fireEvent, render } from '@testing-library/svelte';

const LABEL = 'Receive';

describe('ListItemCheckbox', () => {
	it('renders a list row with a checkbox and its label', () => {
		const { container, getByText } = render(ListItemCheckboxTest, {
			label: LABEL,
			checked: false,
			onChange: vi.fn()
		});

		expect(container.querySelector('li .checkbox')).not.toBeNull();
		expect(getByText(LABEL)).toBeInTheDocument();
	});

	it('reflects the checked state', () => {
		const { container } = render(ListItemCheckboxTest, {
			label: LABEL,
			checked: true,
			onChange: vi.fn()
		});

		expect(container.querySelector('input[type="checkbox"]')).toBeChecked();
	});

	it('calls onChange when the row is clicked', async () => {
		const onChange = vi.fn();
		const { container } = render(ListItemCheckboxTest, { label: LABEL, checked: false, onChange });

		await fireEvent.click(container.querySelector('li .checkbox') as HTMLElement);

		expect(onChange).toHaveBeenCalledOnce();
	});
});
