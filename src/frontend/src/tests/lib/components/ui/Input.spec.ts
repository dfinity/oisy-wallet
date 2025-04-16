import Input from '$lib/components/ui/Input.svelte';
import { fireEvent, render } from '@testing-library/svelte';
import { tick } from 'svelte';

describe('Input', () => {
	const defaultProps = {
		value: undefined,
		placeholder: 'Test placeholder',
		inputType: 'text' as const, // Explicitly type as 'text'
		name: 'test-input', // Add required name property
		showResetButton: false,
		autofocus: false,
		testId: 'input-test'
	};

	it('renders with default props', () => {
		const { getByPlaceholderText } = render(Input, defaultProps);
		const input = getByPlaceholderText('Test placeholder');

		expect(input).toBeInTheDocument();
	});

	it('binds value correctly', async () => {
		const { getByPlaceholderText } = render(Input, defaultProps);
		const input = getByPlaceholderText('Test placeholder');

		await fireEvent.input(input, { target: { value: 'test value' } });

		expect(input).toHaveValue('test value');
	});

	it('shows reset button when showResetButton is true and value exists', () => {
		const props = {
			...defaultProps,
			showResetButton: true,
			value: 'test value'
		};

		const { getByRole } = render(Input, props);

		// Find the reset button by its role and aria-label
		const resetButton = getByRole('button');
		expect(resetButton).toBeInTheDocument();
	});

	it('does not show reset button when showResetButton is true but value is empty', () => {
		const props = {
			...defaultProps,
			showResetButton: true,
			value: ''
		};

		const { queryByRole } = render(Input, props);

		// The reset button should not be present
		const resetButton = queryByRole('button');
		expect(resetButton).not.toBeInTheDocument();
	});

	it('clears input when reset button is clicked', async () => {
		const props = {
			...defaultProps,
			showResetButton: true,
			value: 'test value'
		};

		const { getByRole, getByPlaceholderText } = render(Input, props);

		const resetButton = getByRole('button');
		const input = getByPlaceholderText('Test placeholder');

		expect(input).toHaveValue('test value');

		await fireEvent.click(resetButton);

		expect(input).toHaveValue('');
	});

	it('focuses input when autofocus is true', async () => {
		const props = {
			...defaultProps,
			autofocus: true
		};

		const { getByPlaceholderText } = render(Input, props);
		const input = getByPlaceholderText('Test placeholder');

		// Need to wait for the onMount to execute
		await tick();

		expect(document.activeElement).toBe(input);
	});

	it('passes through other props to GixInput', () => {
		const props = {
			...defaultProps,
			required: true,
			disabled: true
		};

		const { getByPlaceholderText } = render(Input, props);
		const input = getByPlaceholderText('Test placeholder');

		expect(input).toHaveAttribute('name', 'test-input');
		expect(input).toHaveAttribute('required');
		expect(input).toHaveAttribute('disabled');
	});
});
