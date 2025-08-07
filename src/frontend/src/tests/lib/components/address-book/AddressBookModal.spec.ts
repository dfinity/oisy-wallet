import AddressBookModal from '$lib/components/address-book/AddressBookModal.svelte';
import {
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_MODAL,
	ADDRESS_BOOK_SAVE_BUTTON,
	BUTTON_MODAL_CLOSE,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	CONTACT_HEADER_EDIT_BUTTON,
	CONTACT_SHOW_ADD_ADDRESS_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON,
	MODAL_TITLE
} from '$lib/constants/test-ids.constants';
import { AddressBookSteps } from '$lib/enums/progress-steps';
import { loadContacts } from '$lib/services/manage-contacts.service';
import { contactsStore } from '$lib/stores/contacts.store';
import { modalStore } from '$lib/stores/modal.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockManageContactsService } from '$tests/mocks/manage-contacts.service.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('AddressBookModal', () => {
	let cleanup: { restore: () => void };

	beforeEach(async () => {
		// Reset the contacts store before each test
		contactsStore.reset();

		// Mock the auth identity
		mockAuthStore();

		// Mock the manage-contacts service
		cleanup = mockManageContactsService();

		// Load contacts (this will set an empty array in the store)
		await loadContacts(mockIdentity);

		Object.defineProperty(window, 'navigator', {
			writable: true,
			value: {
				userAgentData: {
					mobile: true
				}
			}
		});
	});

	afterEach(() => {
		// Restore the original service methods
		cleanup.restore();

		// Restore the auth mock
		vi.restoreAllMocks();
	});

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

		await waitFor(() => {
			// Should be back on address book step
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
		});
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

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		await waitFor(() => {
			// Should be back on address book step
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
			// Contact should be displayed in the list
			expect(getByText('Test Contact', { exact: false })).toBeInTheDocument();
		});
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

		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeEnabled();

		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
			expect(getByText('Contact 1', { exact: false })).toBeInTheDocument();
		});

		// Add second contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Contact 2' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
			expect(getByText('Contact 1', { exact: false })).toBeInTheDocument();
			expect(getByText('Contact 2', { exact: false })).toBeInTheDocument();
		});
	});

	it('should display contacts using ContactCard components', async () => {
		const { getByTestId, findAllByTestId } = render(AddressBookModal);

		// Add first contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Contact 1' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		// Wait for the contact card to be displayed
		const contactCards = await findAllByTestId(CONTACT_CARD);

		expect(contactCards).toHaveLength(1);
		expect(contactCards[0]).toBeInTheDocument();
	});

	it('should navigate to show contact step when ContactCard is clicked', async () => {
		const { getByTestId, getAllByTestId } = render(AddressBookModal);

		// Add a contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Test Contact' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
		});

		// Click on the contact card
		const contactButtons = getAllByTestId(CONTACT_CARD_BUTTON);
		await fireEvent.click(contactButtons[0]);

		// Should navigate to show contact step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
	});

	it('should navigate from show contact step to address book when close button is clicked', async () => {
		const { getByTestId } = render(AddressBookModal);

		// Add a contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Test Contact' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		// Click close button
		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		// Should be back on address book step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.text.title);
	});

	it('should navigate from edit contact step to show contact when close button is clicked', async () => {
		const { getByTestId } = render(AddressBookModal);

		// Add a contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Test Contact' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		// Navigate to edit contact step
		await fireEvent.click(getByTestId(CONTACT_HEADER_EDIT_BUTTON));

		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.edit_contact.title);

		// Click close button
		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		// Should be back on show contact step
		expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
	});

	it('should navigate from edit address step to show contact when close button is clicked', async () => {
		const { getByTestId } = render(AddressBookModal);

		// Add a contact
		await fireEvent.click(getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON));
		await fireEvent.input(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT), {
			target: { value: 'Test Contact' }
		});
		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		// Wait for navigation to show contact step
		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});

		// Navigate to add address step
		await fireEvent.click(getByTestId(CONTACT_SHOW_ADD_ADDRESS_BUTTON));

		// Wait for navigation to edit address step
		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.edit_contact.title);
		});

		// Click close button
		await fireEvent.click(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON));

		// Should be back on show contact step
		await waitFor(() => {
			expect(getByTestId(MODAL_TITLE)).toHaveTextContent(en.address_book.show_contact.title);
		});
	});

	it('should display pre-existing contacts from the store', async () => {
		// Pre-populate the contacts store with contacts
		const contact = {
			id: BigInt(1),
			name: 'Pre-existing Contact',
			updateTimestampNs: BigInt(Date.now()),
			addresses: []
		};

		contactsStore.set([contact]);

		const { getByText } = render(AddressBookModal);

		// Wait for the component to update
		await waitFor(() => {
			// The existing contact should be displayed
			expect(getByText('Pre-existing Contact', { exact: false })).toBeInTheDocument();
		});
	});

	it('should execute the onComplete callback function when the modal is closed during save address entrypoint', async () => {
		const { getByTestId } = render(AddressBookModal);

		const onComplete = vi.fn();

		modalStore.openAddressBook({
			id: Symbol(),
			data: { entrypoint: { type: AddressBookSteps.SAVE_ADDRESS, address: '0x123', onComplete } }
		});

		expect(getByTestId(BUTTON_MODAL_CLOSE)).toBeInTheDocument();

		await fireEvent.click(getByTestId(BUTTON_MODAL_CLOSE));

		expect(onComplete).toHaveBeenCalledOnce();
	});
});
