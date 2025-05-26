import AddressForm from '$lib/components/address/AddressForm.svelte';
import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADDRESS_ALIAS_INPUT
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import AddressFormTestHost from '$tests/lib/components/address/AddressFormTestHost.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('AddressForm', () => {
	it('should render the form with address and label fields', () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, getByText } = render(AddressForm, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		waitFor(() => {
			// Check that the address field is rendered
			expect(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT)).toBeInTheDocument();
			expect(getByText(en.address.fields.address)).toBeInTheDocument();

			// Check that the label field is rendered
			expect(getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT)).toBeInTheDocument();
			expect(getByText(en.address.fields.label)).toBeInTheDocument();
		});
	});

	it('should bind address value correctly', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId } = render(AddressForm, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		const testAddress = '0x1234567890abcdef1234567890abcdef12345678';

		await fireEvent.input(addressInput, { target: { value: testAddress } });

		waitFor(() => {
			expect(address.address).toBe(testAddress);
		});
	});

	it('should bind label value correctly', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId } = render(AddressForm, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		const testLabel = 'Test Label';

		await fireEvent.input(labelInput, { target: { value: testLabel } });

		waitFor(() => {
			expect(address.label).toBe(testLabel);
		});
	});

	it('should disable address input when isNewAddress is false', () => {
		const address: Partial<ContactAddressUi> = {
			address: '0x1234567890abcdef1234567890abcdef12345678',
			addressType: 'Eth'
		};

		const { getByTestId } = render(AddressForm, {
			props: {
				address,
				isNewAddress: false,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		waitFor(() => {
			expect(addressInput).toBeDisabled();
		});
	});

	it('should enable address input when isNewAddress is true', () => {
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId } = render(AddressForm, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		waitFor(() => {
			expect(addressInput).not.toBeDisabled();
		});
	});
});

describe('AddressFormTestHost', () => {
	it('should bind address object between host and form', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId } = render(AddressFormTestHost, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
		const testLabel = 'Test Label';

		await fireEvent.input(addressInput, { target: { value: testAddress } });
		await fireEvent.input(labelInput, { target: { value: testLabel } });

		waitFor(() => {
			expect(address.address).toBe(testAddress);
			expect(address.label).toBe(testLabel);
		});
	});

	it('should update isInvalid when address is invalid or valid', async () => {
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId, component } = render(AddressFormTestHost, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		// Trigger an invalid address input
		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, { target: { value: 'invalid-address' } });

		// Check that isInvalid is now true
		expect(component.getIsInvalid()).toBeTruthy();

		const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
		await fireEvent.input(addressInput, { target: { value: validAddress } });

		waitFor(() => {
			// Check that isInvalid is now true
			expect(component.getIsInvalid()).toBeFalsy();
		});
	});

	it('should maintain address type when address is updated', async () => {
		const address: Partial<ContactAddressUi> = {
			addressType: 'Btc'
		};

		const { getByTestId } = render(AddressFormTestHost, {
			props: {
				address,
				isNewAddress: true,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		const validEthAddress = '0x1234567890abcdef1234567890abcdef12345678';

		await fireEvent.input(addressInput, { target: { value: validEthAddress } });

		waitFor(() => {
			expect(address.address).toBe(validEthAddress);
			expect(address.addressType).toBe('Eth');
		});
	});
});
