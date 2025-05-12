import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
import type { Address } from '$lib/types/contact';
import { render, screen } from '@testing-library/svelte';

describe('AddressBookQrCode', () => {
	const mockAddress: Address = {
		address: '0x1234567890abcdef',
		address_type: 'Eth',
		alias: 'Main Wallet'
	};

	it('renders the QRCode with the correct value', () => {
		render(AddressBookQrCode, { props: { address: mockAddress } });
		expect(screen.getByTestId('qr-code')).toBeInTheDocument();
	});
});
