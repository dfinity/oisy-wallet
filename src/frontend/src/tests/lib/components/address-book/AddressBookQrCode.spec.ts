import { render, screen } from '@testing-library/svelte';
import AddressBookQrCode from '$lib/components/address-book/AddressBookQrCode.svelte';
import type { Address } from '$lib/types/contact';

describe('AddressBookQrCode', () => {
	const mockAddress: Address = {
		address: '0x1234567890abcdef',
		address_type: 'Eth',
		alias: 'Test Wallet'
	};

	it('renders QR code with the address', () => {
		render(AddressBookQrCode, { props: { address: mockAddress } });
		expect(screen.getByLabelText(/qr code/i)).toBeInTheDocument();
	});

});
