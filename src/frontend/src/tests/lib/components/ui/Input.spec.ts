import Input from '$lib/components/ui/Input.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('Input', () => {
	const defaultProps = {
		value: undefined,
		placeholder: 'Test placeholder',
		inputType: 'text' as const,
		name: 'test-input',
		showResetButton: false,
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

	['test value', ' ', 0, 1].forEach((nonEmptyValue) => {
		it(`shows reset button when showResetButton is true and value is ${JSON.stringify(nonEmptyValue)}`, () => {
			const props = {
				...defaultProps,
				showResetButton: true,
				value: nonEmptyValue
			};

			const { getByRole } = render(Input, props);

			// Find the reset button by its role and aria-label
			const resetButton = getByRole('button');

			expect(resetButton).toBeInTheDocument();
		});
	});

	['', undefined].forEach((emptyValue) => {
		it(`does not show reset button when showResetButton is true but value is ${JSON.stringify(emptyValue)}`, () => {
			const props = {
				...defaultProps,
				showResetButton: true,
				value: emptyValue
			};

			const { queryByRole } = render(Input, props);

			// The reset button should not be present
			const resetButton = queryByRole('button');

			expect(resetButton).not.toBeInTheDocument();
		});
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

	describe('clipboard paste functionality', () => {
		beforeEach(() => {
			// Mock the Clipboard API
			Object.defineProperty(navigator, 'clipboard', {
				value: {
					readText: vi.fn().mockResolvedValue('clipboard content')
				},
				configurable: true
			});
		});

		it('shows paste button when showPasteButton is true', () => {
			const props = {
				...defaultProps,
				showPasteButton: true
			};

			const { getByText } = render(Input, props);
			const pasteButton = getByText(en.core.text.paste);

			expect(pasteButton).toBeInTheDocument();
		});

		it('does not show paste button when showPasteButton is false', () => {
			const props = {
				...defaultProps,
				showPasteButton: false
			};

			const { queryByText } = render(Input, props);
			const pasteButton = queryByText(en.core.text.paste);

			expect(pasteButton).not.toBeInTheDocument();
		});

		it('pastes clipboard content when paste button is clicked', async () => {
			const props = {
				...defaultProps,
				showPasteButton: true
			};

			const { getByText, getByPlaceholderText } = render(Input, props);
			const pasteButton = getByText(en.core.text.paste);
			const input = getByPlaceholderText('Test placeholder');

			await fireEvent.click(pasteButton);

			// Wait for the clipboard promise to resolve
			await new Promise(process.nextTick);

			expect(navigator.clipboard.readText).toHaveBeenCalled();
			expect(input).toHaveValue('clipboard content');
		});
	});
});
