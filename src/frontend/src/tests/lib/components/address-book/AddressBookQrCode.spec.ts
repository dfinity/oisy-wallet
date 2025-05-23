import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
import type { ContactAddressUi } from '$lib/types/contact';
import { render } from '@testing-library/svelte';

describe('AddressBookQrCode', () => {
	const mockAddress: ContactAddressUi = {
		address: '0x1234567890abcdef',
		addressType: 'Eth',
		label: 'Main Wallet'
	};

	it('renders the QRCode wrapper container', () => {
		const { container } = render(AddressBookQrCode, { props: { address: mockAddress } });

		// Check that the outer QR container exists
		const qrContainer = container.querySelector('div[class*="aspect-square"]');

		expect(qrContainer).toBeInTheDocument();
	});

	it('renders IconAddressType inside the QR logo slot', () => {
		const { container } = render(AddressBookQrCode, { props: { address: mockAddress } });

		const icon = container.querySelector('svg'); // IconAddressType renders an SVG

		expect(icon).toBeInTheDocument();
	});
});
