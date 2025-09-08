import AddressInfoCard from '$lib/components/address-book/AddressInfoCard.svelte';
import type { ContactAddressUi } from '$lib/types/contact';
import { render } from '@testing-library/svelte';

describe('AddressInfoCard', () => {
	const mockAddress: ContactAddressUi = {
		address: '0x1234567890abcdef',
		addressType: 'Eth',
		label: 'Main Wallet'
	};

	it('should render address type label and wallet label', () => {
		const { getByText } = render(AddressInfoCard, {
			props: { address: mockAddress }
		});

		expect(getByText(/Main Wallet/i)).toBeInTheDocument();
		expect(getByText(/0x1234/i)).toBeInTheDocument(); // adjust if full address shown
		expect(getByText(/Eth/i)).toBeInTheDocument();
	});

	it('should show fallback when address label is missing', () => {
		const addressWithoutLabel: ContactAddressUi = {
			address: '0xabcdef123456',
			addressType: 'Eth',
			label: ''
		};

		const { getByText } = render(AddressInfoCard, {
			props: { address: addressWithoutLabel }
		});

		expect(getByText(/0xabc/i)).toBeInTheDocument();
		expect(getByText(/Eth/i)).toBeInTheDocument();
	});
});
