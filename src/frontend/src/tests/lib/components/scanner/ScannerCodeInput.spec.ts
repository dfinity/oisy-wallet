import ScannerCodeInput from '$lib/components/scanner/ScannerCodeInput.svelte';
import { render, screen } from '@testing-library/svelte';

describe('ScannerCodeInput', () => {
	const defaultProps = {
		value: '',
		label: 'Enter Code',
		placeholder: 'Type your code',
		name: 'code'
	};

	it('should render label and input', () => {
		render(ScannerCodeInput, defaultProps);

		expect(screen.getByText('Enter Code')).toBeInTheDocument();
		expect(screen.getByPlaceholderText('Type your code')).toBeInTheDocument();
	});

	it('should display initial value', () => {
		render(ScannerCodeInput, {
			...defaultProps,
			value: 'initial-value'
		});

		const input = screen.getByPlaceholderText('Type your code');

		expect(input).toHaveValue('initial-value');
	});

	it('should show error message when provided', () => {
		render(ScannerCodeInput, {
			...defaultProps,
			error: 'Invalid code'
		});

		expect(screen.getByText('Invalid code')).toBeInTheDocument();
	});

	it('should not show error when undefined or empty', () => {
		const { container } = render(ScannerCodeInput, defaultProps);

		const errorParagraph = container.querySelector('.text-error-primary');

		expect(errorParagraph).not.toBeInTheDocument();
	});

	it('should apply error border color when error exists', () => {
		const { container } = render(ScannerCodeInput, {
			...defaultProps,
			error: 'Invalid code'
		});

		const styledDiv = container.querySelector('[style*="--input-custom-border-color"]');

		expect(styledDiv?.getAttribute('style')).toContain('var(--color-border-error-solid)');
	});

	it('should use inherit border color when no error', () => {
		const { container } = render(ScannerCodeInput, defaultProps);

		const styledDiv = container.querySelector('[style*="--input-custom-border-color"]');

		expect(styledDiv?.getAttribute('style')).toContain('inherit');
	});
});
