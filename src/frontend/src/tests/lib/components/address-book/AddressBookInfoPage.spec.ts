import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
import type { Address } from '$lib/types/contact';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('AddressBookInfoPage', () => {
	const mockAddress: Address = {
		address: '0x1234567890abcdef',
		address_type: 'Eth',
		alias: 'Main Wallet'
	};

	it('should render QR code and address info', () => {
		const close = vi.fn();
		const { getByTestId, getByText } = render(AddressBookInfoPage, {
			props: {
				address: mockAddress,
				close
			}
		});
		expect(getByText(/Main Wallet/i)).toBeInTheDocument();
		expect(getByTestId('qr-code')).toBeInTheDocument();

		expect(getByTestId(ADDRESS_EDIT_CANCEL_BUTTON)).toBeInTheDocument();
	});

	it('should call close when cancel button is clicked', async () => {
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
});
