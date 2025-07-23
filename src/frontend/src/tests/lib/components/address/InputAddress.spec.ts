import InputAddress from '$lib/components/address/InputAddress.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('InputAddress', () => {
	const VALID_BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh';
	const INVALID_BTC_ADDRESS = 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlx';

	const defaultProps = {
		value: undefined,
		placeholder: 'Enter BTC address',
		name: 'btc-address-input',
		testId: 'input-address-test'
	};

	it('renders with default props', () => {
		const { getByPlaceholderText } = render(InputAddress, defaultProps);
		const input = getByPlaceholderText('Enter BTC address');

		expect(input).toBeInTheDocument();
	});

	it('binds value correctly', async () => {
		const { getByPlaceholderText } = render(InputAddress, defaultProps);
		const input = getByPlaceholderText('Enter BTC address');

		await fireEvent.input(input, { target: { value: 'test value' } });

		expect(input).toHaveValue('test value');
	});

	it('shows error message for invalid BTC address', async () => {
		const { getByPlaceholderText, getByText } = render(InputAddress, defaultProps);
		const input = getByPlaceholderText('Enter BTC address');

		// Enter an invalid BTC address
		await fireEvent.input(input, { target: { value: INVALID_BTC_ADDRESS } });

		// Check if error message is displayed
		const errorMessage = getByText(en.address.form.invalid_address);

		expect(errorMessage).toBeInTheDocument();

		expect(errorMessage).toHaveClass('text-error-primary');
	});

	it('shows success message for valid BTC address', async () => {
		const { getByPlaceholderText, getByText } = render(InputAddress, defaultProps);
		const input = getByPlaceholderText('Enter BTC address');

		// Enter a valid BTC address (starting with bc1)
		await fireEvent.input(input, {
			target: { value: VALID_BTC_ADDRESS }
		});

		// Check if success message is displayed
		const successMessage = getByText(en.address.form.valid_for_networks, { exact: false });

		expect(successMessage).toBeInTheDocument();

		expect(successMessage).toHaveClass('text-success-primary');
		expect(successMessage).toHaveTextContent('Bitcoin');
	});

	it('does not show QR button when onQRCodeScan is not provided', () => {
		const { queryByRole } = render(InputAddress, defaultProps);

		// The QR button should not be present
		const qrButton = queryByRole('button', { name: en.send.text.open_qr_modal });

		expect(qrButton).not.toBeInTheDocument();
	});

	it('shows QR button when onQRCodeScan is provided', () => {
		const onQRCodeScan = vi.fn();
		const props = {
			...defaultProps,
			onQRCodeScan
		};

		const { getByRole } = render(InputAddress, props);

		// The QR button should be present
		const qrButton = getByRole('button', { name: en.send.text.open_qr_modal });

		expect(qrButton).toBeInTheDocument();
	});

	it('calls onQRCodeScan when QR button is clicked', async () => {
		const onQRCodeScan = vi.fn();
		const props = {
			...defaultProps,
			onQRCodeScan
		};

		const { getByRole } = render(InputAddress, props);
		const qrButton = getByRole('button', { name: en.send.text.open_qr_modal });

		await fireEvent.click(qrButton);

		expect(onQRCodeScan).toHaveBeenCalled();
	});

	it('applies custom border color based on validation state', async () => {
		const { getByPlaceholderText, container } = render(InputAddress, defaultProps);
		const input = getByPlaceholderText('Enter BTC address');

		// Initially, border color should be inherit
		const initialDiv = container.querySelector('div');

		expect(initialDiv).toHaveStyle('--input-custom-border-color: inherit');

		// Enter an invalid BTC address
		await fireEvent.input(input, { target: { value: INVALID_BTC_ADDRESS } });

		// Border color should be error color
		expect(initialDiv).toHaveStyle('--input-custom-border-color: var(--color-border-error-solid)');

		// Enter a valid BTC address
		await fireEvent.input(input, {
			target: { value: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' }
		});

		// Border color should be success color
		expect(initialDiv).toHaveStyle(
			'--input-custom-border-color: var(--color-border-success-solid)'
		);
	});

	it('passes through other props to Input component', () => {
		const props = {
			...defaultProps,
			required: true,
			disabled: true
		};

		const { getByPlaceholderText } = render(InputAddress, props);
		const input = getByPlaceholderText('Enter BTC address');

		expect(input).toHaveAttribute('name', 'btc-address-input');
		expect(input).toHaveAttribute('required');
		expect(input).toHaveAttribute('disabled');
	});
});
