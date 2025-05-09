import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
import {
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_MODAL,
	ADDRESS_BOOK_SAVE_BUTTON,
	CONTACT_HEADER_EDIT_BUTTON,
	CONTACT_HEADER_EDITING_EDIT_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON,
	MODAL_TITLE
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('AddressBookModal', () => {
	it('should render the address book step initially', () => {
		const { getByTestId } = render(AddressBookModal);

		expect(getByTestId(ADDRESS_BOOK_MODAL)).toBeInTheDocument();
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});

	it('should navigate to add contact step when add contact button is clicked', async () => {
		const { getByTestId } = render(AddressBookModal);

		// Initially on address book step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);

		// Click add contact button
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		// Should now be on add contact step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.contact.form.add_new_contact);
	});

	it('should navigate back to address book step when close button is clicked on add contact step', async () => {
		const { getByTestId } = render(AddressBookModal);

		// Navigate to add contact step
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.contact.form.add_new_contact);

		// Click close button
		await fireEvent.click(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON));

		// Should be back on address book step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});

	it('should add a contact and display it in the address book', async () => {
		const { getByTestId, getByText } = render(AddressBookModal);

		// Navigate to add contact step
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		// Fill out contact form
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Should change the title to the new contacts name
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent('Test Contact');

		// Save contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Should be back on address book step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);

		// Contact should be displayed in the list
		expect(getByText('Test Contact', { exact: false })).toBeInTheDocument();
	});

	it('should not add a contact if name is empty', async () => {
		const { getByTestId } = render(AddressBookModal);

		// Navigate to add contact step
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		// Leave name input empty
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: '' } });

		// Try to save contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Should still be on add contact step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.contact.form.add_new_contact);
	});

	it('should maintain the contacts list across navigation', async () => {
		const { getByTestId, getByText } = render(AddressBookModal);

		// Add first contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Contact 1' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Add second contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Contact 2' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Both contacts should be displayed
		expect(getByText('Contact 1', { exact: false })).toBeInTheDocument();
		expect(getByText('Contact 2', { exact: false })).toBeInTheDocument();
	});

	it('should navigate to show contact step when a contact is clicked and back to address book when close button is clicked', async () => {
		const { getByTestId, getByText } = render(AddressBookModal);

		// Add a contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Test Contact' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Click on the contact to navigate to show contact step
		await fireEvent.click(getByText('Show contact Test Contact'));

		// Should now be on show contact step with the contact name in the title
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		expect(getByText('Test Contact')).toBeInTheDocument();

		// Click close button
		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		// Should be back on address book step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});

	it('should allow editing a contact name', async () => {
		const { getByTestId, getByText, queryByText } = render(AddressBookModal);

		// Add a contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Original Name' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Click on the contact to navigate to show contact step
		await fireEvent.click(getByText('Show contact Original Name'));

		// Should now be on show contact step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		expect(getByText('Original Name')).toBeInTheDocument();

		// Click edit button
		await fireEvent.click(getByTestId(CONTACT_HEADER_EDIT_BUTTON));
		// Should now be in edit mode
		await fireEvent.click(getByTestId(CONTACT_HEADER_EDITING_EDIT_BUTTON));

		// Should now be in edit name form
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);

		expect(nameInput).toHaveValue('Original Name');

		// Change the contact name
		await fireEvent.input(nameInput, { target: { value: 'Updated Name' } });

		// Save the changes
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Should be back on address book step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);

		// Verify the updated contact is displayed and the original name is not

		expect(getByText('Updated Name', { exact: false })).toBeInTheDocument();

		expect(queryByText('Original Name', { exact: false })).not.toBeInTheDocument();
	});
});
