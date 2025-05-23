import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('AddressBookInfoPage', () => {
	const mockAddress: ContactAddressUi = {
		address: '0x1234567890abcdef',
		addressType: 'Eth',
		label: 'Main Wallet'
	};

	it('should render QR code, address label, and back button', () => {
		const close = vi.fn();
		const { getByText, getByTestId } = render(AddressBookInfoPage, {
			props: {
				address: mockAddress,
				close
			}
		});

		expect(getByText(/Main Wallet/i)).toBeInTheDocument();
		expect(getByText(/0x1234/i)).toBeInTheDocument(); // shortened or full address
		expect(getByTestId(ADDRESS_EDIT_CANCEL_BUTTON)).toBeInTheDocument();
	});

	it('should call close when back button is clicked', async () => {
		const close = vi.fn();
		const { getByTestId } = render(AddressBookInfoPage, {
			props: {
				address: mockAddress,
				close
			}
		});

		await fireEvent.click(getByTestId(ADDRESS_EDIT_CANCEL_BUTTON));
		expect(close).toHaveBeenCalled();
	});

	it('should show fallback message when address is missing', () => {
		const close = vi.fn();
		const { getByText } = render(AddressBookInfoPage, {
			props: {
				address: { address: '', addressType: 'Eth' },
				close
			}
		});

		expect(getByText(/No address available/i)).toBeInTheDocument();
	});
});
