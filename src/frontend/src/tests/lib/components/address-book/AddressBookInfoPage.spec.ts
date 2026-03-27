import AddressBookInfoPage from '$lib/components/address-book/AddressBookInfoPage.svelte';
import { ADDRESS_EDIT_CANCEL_BUTTON } from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

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

		// fix: assert string fallback or non-null
		expect(getByText(mockAddress.label ?? '')).toBeInTheDocument();
		expect(getByText(/0x1234/i)).toBeInTheDocument();
		expect(getByText(en.address.types.Eth)).toBeInTheDocument();
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
});
