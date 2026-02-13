import RadioBox from '$lib/components/ui/RadioBox.svelte';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { assertNonNullish } from '@dfinity/utils';
import { fireEvent, render } from '@testing-library/svelte';

describe('RadioBox', () => {
	const labelTestId = 'label';
	const descriptionTestId = 'description';
	const props = {
		checked: false,
		disabled: false,
		label: createMockSnippet(labelTestId),
		description: createMockSnippet(descriptionTestId),
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

		assertNonNullish(boxElm);

		await fireEvent.click(boxElm);

		expect(props.onChange).toHaveBeenCalledOnce();
	});

	it('should render a label and optional description', async () => {
		const { getByTestId, rerender } = render(RadioBox, {
			props
		});

		let label: HTMLElement | null = getByTestId(labelTestId);
		const description: HTMLElement | null = getByTestId(descriptionTestId);

		expect(label).toBeInTheDocument();
		expect(description).toBeInTheDocument();

		await rerender({ ...props, description: undefined });

		label = getByTestId(labelTestId);

		expect(label).toBeInTheDocument();
		expect(() => getByTestId(descriptionTestId)).toThrowError();
	});
});
