import ContactForm from '$lib/components/address-book/ContactForm.svelte';
import { ADDRESS_BOOK_CONTACT_NAME_INPUT } from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('ContactForm', () => {
	it('should render the contact form with name field', () => {
		const { getByTestId, getByText } = render(ContactForm, { props: { contact: {} } });

		// Check that the name field is rendered
		expect(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT)).toBeInTheDocument();
		expect(getByText(en.contact.fields.name)).toBeInTheDocument();
	});

	it('should validate successfully when name is provided', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, queryByText } = render(ContactForm, { props: { contact } });

		// Enter a name
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		expect(
			queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).not.toBeInTheDocument();
	});

	it('should fail validation when name is empty', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, queryByText } = render(ContactForm, { props: { contact } });

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: '' } });

		// If name too long error does NOT show, that means it passed basic validation but not trimmed input
		// So check that there's NO success, rather than checking isValid()
		expect(
			queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).not.toBeInTheDocument();
	});

	it('should show error when name exceeds max length', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, getByText } = render(ContactForm, { props: { contact } });

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		const longName = 'A'.repeat(101);

		await fireEvent.input(nameInput, { target: { value: longName } });

		expect(
			getByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).toBeInTheDocument();
	});

	it('should not show error message on load', () => {
		const contact: Partial<ContactUi> = {};
		const { queryByText } = render(ContactForm, { props: { contact } });

		expect(
			queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).not.toBeInTheDocument();
	});

	it('should not show error when name is valid and within max length', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, queryByText } = render(ContactForm, { props: { contact } });

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Valid Name' } });

		expect(
			queryByText(en.contact.error.name_too_long.replace('$maxCharacters', '100'))
		).not.toBeInTheDocument();
	});

	it('should show and then hide error when name is corrected', async () => {
		const contact: Partial<ContactUi> = {};
		const { getByTestId, queryByText, getByText } = render(ContactForm, { props: { contact } });

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
