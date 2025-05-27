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

	it('should render QR code, address info card, and back button', () => {
		const onClose = vi.fn();
		const { getByText, getByTestId } = render(AddressBookInfoPage, {
			props: {
				address: mockAddress,
				onClose
			}
		});

		expect(getByText(/Main Wallet/i)).toBeInTheDocument();
		expect(getByText(/0x1234/i)).toBeInTheDocument();
		expect(getByText(/Eth/i)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_EDIT_CANCEL_BUTTON)).toBeInTheDocument();
	});

	it('should call onClose when back button is clicked', async () => {
		const onClose = vi.fn();
		const { getByTestId } = render(AddressBookInfoPage, {
			props: {
				address: mockAddress,
				onClose
			}
		});

		await fireEvent.click(getByTestId(ADDRESS_EDIT_CANCEL_BUTTON));

		expect(onClose).toHaveBeenCalled();
	});

	it('should show fallback message when address is missing', () => {
		const onClose = vi.fn();
		const { getByText } = render(AddressBookInfoPage, {
			props: {
				address: { address: '', addressType: 'Eth' },
				onClose
			}
		});

		expect(getByText(/No address available/i)).toBeInTheDocument();
	});
});
