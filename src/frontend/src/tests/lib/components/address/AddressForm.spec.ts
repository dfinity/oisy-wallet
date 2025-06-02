import AddressForm from '$lib/components/address/AddressForm.svelte';
import { CONTACT_MAX_LABEL_LENGTH } from '$lib/constants/app.constants';
import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADDRESS_ALIAS_INPUT
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import AddressFormTestHost from '$tests/lib/components/address/AddressFormTestHost.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('AddressForm', () => {
	it('should render the form with address and label fields', () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, getByText } = render(AddressForm, {
			props: {
				address,
				isInvalid: false
			}
		});

		// Check that the address field is rendered
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT)).toBeInTheDocument();
		expect(getByText(en.address.fields.address)).toBeInTheDocument();

		// Check that the label field is rendered
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT)).toBeInTheDocument();
		expect(getByText(en.address.fields.label)).toBeInTheDocument();
	});

	it('should disable address input when disableAddressField is true', () => {
		const address: Partial<ContactAddressUi> = {
			address: '0x1234567890abcdef1234567890abcdef12345678',
			addressType: 'Eth'
		};

		const { getByTestId } = render(AddressForm, {
			props: {
				address,
				disableAddressField: true,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		expect(addressInput).toBeDisabled();
	});

	it('should enable address input when disableAddressField is false', () => {
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId } = render(AddressForm, {
			props: {
				address,
				disableAddressField: false,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		expect(addressInput).not.toBeDisabled();
	});
});

describe('AddressFormTestHost', () => {
	it('should bind address object between host and form', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, component } = render(AddressFormTestHost, {
			props: {
				address,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		const testAddress = '0x1234567890abcdef1234567890abcdef12345678';
		const testLabel = 'Test Label';

		await fireEvent.input(addressInput, { target: { value: testAddress } });
		await fireEvent.input(labelInput, { target: { value: testLabel } });

		expect(component.getAddress().address).toBe(testAddress);
		expect(component.getAddress().label).toBe(testLabel);
	});

	it('should update isInvalid when address is invalid or valid', async () => {
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId, component } = render(AddressFormTestHost, {
			props: {
				address,
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

		// Check that isInvalid is now true
		expect(component.getIsInvalid()).toBeFalsy();
	});

	it('should maintain address type when address is updated', async () => {
		const address: Partial<ContactAddressUi> = {
			addressType: 'Btc'
		};

		const { component, getByTestId } = render(AddressFormTestHost, {
			props: {
				address,
				isInvalid: false
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		expect(addressInput).not.toBeDisabled();

		const validEthAddress = '0x1234567890abcdef1234567890abcdef12345678';
		await fireEvent.input(addressInput, { target: { value: validEthAddress } });

		expect(component.getAddress().address).toBe(validEthAddress);
		expect(component.getAddress().addressType).toBe('Eth');
	});

	it('should show error when label exceeds 50 characters', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, getByText, component } = render(AddressFormTestHost, {
			props: {
				address,
				isInvalid: false
			}
		});

		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		const longLabel = 'This is a very long label that exceeds fifty characters limit';

		await fireEvent.input(labelInput, { target: { value: longLabel } });

		expect(
			getByText(`Label may not exceed ${CONTACT_MAX_LABEL_LENGTH} characters`)
		).toBeInTheDocument();
		expect(component.getIsInvalid).toBeTruthy();
	});
});
