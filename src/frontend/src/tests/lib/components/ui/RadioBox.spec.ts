import RadioBox from '$lib/components/ui/RadioBox.svelte';
import { fireEvent, render } from '@testing-library/svelte';

describe('RadioBox', () => {
	const props = {
		checked: false,
		disabled: false,
		label: 'RadioBox',
		description: 'This is a radio box',
		onChange: vi.fn(),
		id: 'radio-id'
	};

	it('should render the RadioBox', () => {
		const { container } = render(RadioBox, {
			props
		});

		expect(container.querySelector('div.radio')).toBeInTheDocument();
		expect(container.querySelector('label')).toBeInTheDocument();
	});

	it('should render the input in the correct state', async () => {
		const { container, rerender } = render(RadioBox, {
			props
		});

		const input: HTMLInputElement | null = container.querySelector('input');

		expect(input?.checked).toBeFalsy();

		await rerender({ ...props, checked: true });

		expect(input?.checked).toBeTruthy();
	});

	it('should call onChange if the box is clicked', async () => {
		const { container } = render(RadioBox, {
			props
		});

		const boxElm: HTMLLabelElement | null = container.querySelector('label');

		await fireEvent.click(boxElm);

		expect(props.onChange).toHaveBeenCalledOnce();
	});

	it('should render a label and optional description', async () => {
		const { queryByText, rerender } = render(RadioBox, {
			props
		});

		let label: HTMLElement | null = queryByText(props.label);
		let description: HTMLElement | null = queryByText(props.description);

		expect(label).toBeInTheDocument();
		expect(description).toBeInTheDocument();

		await rerender({ ...props, description: undefined });

		label = queryByText(props.label);
		description = queryByText(props.description);

		expect(label).toBeInTheDocument();
		expect(description).not.toBeInTheDocument();
	});
});
