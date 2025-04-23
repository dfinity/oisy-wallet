import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
import {
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_MODAL,
	ADDRESS_BOOK_SAVE_BUTTON,
	MODAL_TITLE
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';

describe('AddressBookModal', () => {
	it('should render the address book step initially', () => {
		render(AddressBookModal);

		expect(screen.getByTestId(ADDRESS_BOOK_MODAL)).toBeInTheDocument();
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});

	it('should navigate to add contact step when add contact button is clicked', async () => {
		render(AddressBookModal);

		// Initially on address book step
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);

		// Click add contact button
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		// Should now be on add contact step
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.contact.form.add_new_contact);
	});

	it('should navigate back to address book step when close button is clicked on add contact step', async () => {
		render(AddressBookModal);

		// Navigate to add contact step
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.contact.form.add_new_contact);

		// Click close button
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_CANCEL_BUTTON));

		// Should be back on address book step
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});

	it('should add a contact and display it in the address book', async () => {
		render(AddressBookModal);

		// Navigate to add contact step
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		// Fill out contact form
		const nameInput = screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Should change the title to the new contacts name
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent('Test Contact');

		// Save contact
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Should be back on address book step
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);

		// Contact should be displayed in the list
		expect(screen.getByText('Test Contact', { exact: false })).toBeInTheDocument();
	});

	it('should not add a contact if name is empty', async () => {
		render(AddressBookModal);

		// Navigate to add contact step
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));

		// Leave name input empty
		const nameInput = screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: '' } });

		// Try to save contact
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Should still be on add contact step
		expect(screen.getByTestId(MODAL_TITLE)).toHaveTextContent(en.contact.form.add_new_contact);
	});

	it('should maintain the contacts list across navigation', async () => {
		render(AddressBookModal);

		// Add first contact
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Contact 1' }
		});
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Add second contact
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Contact 2' }
		});
		await fireEvent.click(screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Both contacts should be displayed
		expect(screen.getByText('Contact 1', { exact: false })).toBeInTheDocument();
		expect(screen.getByText('Contact 2', { exact: false })).toBeInTheDocument();
	});
});
