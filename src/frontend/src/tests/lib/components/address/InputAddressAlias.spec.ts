import InputAddressAlias from '$lib/components/address/InputAddressAlias.svelte';
import { CONTACT_MAX_LABEL_LENGTH } from '$lib/constants/app.constants';
import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADDRESS_ALIAS_INPUT
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi } from '$lib/types/contact';
import InputAddressAliasTestHost from '$tests/lib/components/address/InputAddressAliasTestHost.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('InputAddressAlias', () => {
	it('should render the form with address and label fields', () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, getByText } = render(InputAddressAlias, {
			props: {
				address,
				isValid: false,
				onQRCodeScan: () => {}
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

		const { getByTestId } = render(InputAddressAlias, {
			props: {
				address,
				disableAddressField: true,
				isValid: false,
				onQRCodeScan: () => {}
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		expect(addressInput).toBeDisabled();
	});

	it('should enable address input when disableAddressField is false', () => {
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId } = render(InputAddressAlias, {
			props: {
				address,
				disableAddressField: false,
				isValid: false,
				onQRCodeScan: () => {}
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		expect(addressInput).not.toBeDisabled();
	});

	it('should not trim label input while the user is typing', async () => {
		const { getByTestId } = render(InputAddressAlias, {
			props: {
				address: {},
				isValid: false,
				onQRCodeScan: () => {}
			}
		});

		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT) as HTMLInputElement;
		const testLabel = '  Test Label  ';
		await fireEvent.input(labelInput, { target: { value: testLabel } });

		await new Promise((resolve) => setTimeout(resolve, 1000));

		expect(labelInput.value).toBe(testLabel);
	});
});

describe('AddressFormTestHost', () => {
	it('should bind address object between host and form', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, component } = render(InputAddressAliasTestHost, {
			props: {
				address,
				isValid: false
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

	it('should trim whitespace from label input', async () => {
		const address: Partial<ContactAddressUi> = {};
		const { getByTestId, component } = render(InputAddressAliasTestHost, {
			props: {
				address,
				isValid: false
			}
		});

		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);

		// Test leading spaces
		await fireEvent.input(labelInput, { target: { value: '  test label' } });

		expect(component.getAddress().label).toBe('test label');

		// Test trailing spaces
		await fireEvent.input(labelInput, { target: { value: 'test label  ' } });

		expect(component.getAddress().label).toBe('test label');

		// Test both leading and trailing spaces
		await fireEvent.input(labelInput, { target: { value: '  test label  ' } });

		expect(component.getAddress().label).toBe('test label');
	});

	it('should handle empty string label', async () => {
		const address: Partial<ContactAddressUi> = { label: 'initial' };
		const { getByTestId, component } = render(InputAddressAliasTestHost, {
			props: {
				address,
				isValid: false
			}
		});

		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);

		// Test empty string
		await fireEvent.input(labelInput, { target: { value: '' } });

		expect(component.getAddress().label).toBe('');

		// Test whitespace-only string
		await fireEvent.input(labelInput, { target: { value: '   ' } });

		expect(component.getAddress().label).toBe('');
	});

	it('should update isValid when address is invalid or valid', async () => {
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId, component } = render(InputAddressAliasTestHost, {
			props: {
				address,
				isValid: false
			}
		});

		// Trigger an invalid address input
		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, { target: { value: 'invalid-address' } });

		// Check that isValid is now false
		expect(component.getIsValid()).toBeFalsy();

		const validAddress = '0x1234567890abcdef1234567890abcdef12345678';
		await fireEvent.input(addressInput, { target: { value: validAddress } });

		// Check that isValid is now true
		expect(component.getIsValid()).toBeTruthy();
	});

	it('should maintain address type when address is updated', async () => {
		const address: Partial<ContactAddressUi> = {
			addressType: 'Btc'
		};

		const { component, getByTestId } = render(InputAddressAliasTestHost, {
			props: {
				address,
				isValid: false
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
		const { getByTestId, getByText, component } = render(InputAddressAliasTestHost, {
			props: {
				address,
				isValid: false
			}
		});

		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		const longLabel = 'This is a very long label that exceeds fifty characters limit';

		await fireEvent.input(labelInput, { target: { value: longLabel } });

		expect(
			getByText(`Label may not exceed ${CONTACT_MAX_LABEL_LENGTH} characters`)
		).toBeInTheDocument();
		expect(component.getIsValid()).toBeFalsy();
	});
});
