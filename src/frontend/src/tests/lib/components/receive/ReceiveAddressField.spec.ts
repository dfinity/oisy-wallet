import ReceiveAddressField from '$lib/components/receive/ReceiveAddressField.svelte';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { render, waitFor } from '@testing-library/svelte';

describe('ReceiveAddressField', () => {
	const props = {
		address: mockBtcAddress,
		label: 'Bitcoin address',
		copyAriaLabel: 'Copy Bitcoin address',
		copyButtonTestId: 'copy-button',
		testId: 'address-output'
	};

	it('should show the label and the whole address with its ends set apart', () => {
		const { getByText, getByTestId } = render(ReceiveAddressField, { props });

		expect(getByText(props.label)).toBeInTheDocument();

		const output = getByTestId(props.testId);

		expect(output).toHaveTextContent(mockBtcAddress);
		expect(output.querySelectorAll('span')).toHaveLength(3);
		expect(output.firstElementChild).toHaveTextContent(mockBtcAddress.slice(0, 6));
		expect(output.lastElementChild).toHaveTextContent(mockBtcAddress.slice(-6));
	});

	it('should name its Copy button for what it does', () => {
		const { getByTestId } = render(ReceiveAddressField, { props });

		expect(getByTestId(props.copyButtonTestId)).toHaveAttribute('aria-label', props.copyAriaLabel);
	});

	it('should show no address and no actions while the address loads', () => {
		const { queryByTestId } = render(ReceiveAddressField, {
			props: { ...props, address: undefined }
		});

		expect(queryByTestId(props.testId)).not.toBeInTheDocument();
		expect(queryByTestId(props.copyButtonTestId)).not.toBeInTheDocument();
	});

	it('should offer the QR code when asked, and focus it when it is the one to return to', async () => {
		const onClick = vi.fn();

		const { getByTestId } = render(ReceiveAddressField, {
			props: {
				...props,
				qrCodeAction: {
					enabled: true,
					ariaLabel: 'Show QR code',
					testId: 'qr-button',
					onClick,
					autofocus: true
				}
			}
		});

		await waitFor(() => {
			expect(document.activeElement).toBe(getByTestId('qr-button'));
		});

		getByTestId('qr-button').click();

		expect(onClick).toHaveBeenCalledOnce();
	});
});
