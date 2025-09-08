import InputContactName from '$lib/components/address-book/InputContactName.svelte';
import { ADDRESS_BOOK_CONTACT_NAME_INPUT } from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import InputContactNameTestHost from '$tests/lib/components/address-book/InputContactNameTestHost.svelte';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('InputContactName', () => {
	it('should render the contact form with name field', () => {
		const { getByTestId, getByText } = render(InputContactName, {
			props: { contact: {}, isValid: false }
		});

		// Check that the name field is rendered
		expect(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT)).toBeInTheDocument();
		expect(getByText(en.contact.fields.name)).toBeInTheDocument();
	});

	it('should validate successfully when name is provided', async () => {
		const contact: Partial<ContactUi> = {};
		const { component, getByTestId } = render(InputContactNameTestHost, {
			props: { contact, isValid: false }
		});

		// Enter a name
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Check that validation passed
		expect(component.getIsValid()).toBeTruthy();
	});

	it('should fail validation when name is empty', () => {
		const contact: Partial<ContactUi> = {};
		const { component } = render(InputContactNameTestHost, { props: { contact, isValid: false } });

		// Check that validation failed
		expect(component.getIsValid()).toBeFalsy();
	});

	it('should fail validation when name is only spaces', () => {
		const contact: Partial<ContactUi> = { name: '   ' };
		const { component } = render(InputContactNameTestHost, { props: { contact, isValid: false } });

		// Check that validation failed
		expect(component.getIsValid()).toBeFalsy();
	});

	it('should show error when name exceeds max length', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, getByText } = render(InputContactName, {
			props: { contact, isValid: false }
		});

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		const longName = 'A'.repeat(101);

		await fireEvent.input(nameInput, { target: { value: longName } });

		expect(
			getByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).toBeInTheDocument();
	});

	it('should not show error message on load', () => {
		const contact: Partial<ContactUi> = {};
		const { queryByText } = render(InputContactName, { props: { contact, isValid: false } });

		expect(
			queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).not.toBeInTheDocument();
	});

	it('should not show error when name is valid and within max length', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, queryByText } = render(InputContactName, {
			props: { contact, isValid: false }
		});

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Valid Name' } });

		expect(
			queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).not.toBeInTheDocument();
	});

	it('should show and then hide error when name is corrected', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, queryByText, getByText } = render(InputContactName, {
			props: { contact, isValid: false }
		});

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		const longName = 'A'.repeat(101);
		const shortName = 'Valid';

		// Trigger error
		fireEvent.input(nameInput, { target: { value: longName } });

		expect(
			getByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).toBeInTheDocument();

		// Correct name
		await fireEvent.input(nameInput, { target: { value: shortName } });

		// Wait for error message to be removed after input becomes valid
		await waitFor(() =>
			expect(
				queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
			).not.toBeInTheDocument()
		);
	});
});
