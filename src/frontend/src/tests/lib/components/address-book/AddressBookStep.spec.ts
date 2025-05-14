import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
import { ADDRESS_BOOK_ADD_CONTACT_BUTTON } from '$lib/constants/test-ids.constants';
import type { Contact } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('AddressBookStep', () => {
	const mockContacts: Contact[] = [
		{
			id: 'contact-1',
			name: 'Test Contact 1',
			addresses: [
				{
					id: 'address-1',
					address: '0x123456789abcdef',
					alias: 'My ETH Address'
				}
			]
		},
		{
			id: 'contact-2',
			name: 'Test Contact 2',
			addresses: []
		}
	];

	const mockAddContact = vi.fn();
	const mockShowContact = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render empty state when there are no contacts', () => {
		const { getByText } = render(AddressBookStep, {
			props: {
				contacts: [],
				addContact: mockAddContact,
				showContact: mockShowContact
			}
		});

		// Should show the empty state message
		expect(getByText(en.address_book.text.empty_title)).toBeInTheDocument();
		expect(getByText(en.address_book.text.empty_text)).toBeInTheDocument();

		// Should have an add contact button in the empty state
		const addButton = getByText(en.address_book.text.add_new_contact);

		expect(addButton).toBeInTheDocument();
	});

	it('should call addContact when add contact button is clicked in empty state', async () => {
		const { getByText } = render(AddressBookStep, {
			props: {
				contacts: [],
				addContact: mockAddContact,
				showContact: mockShowContact
			}
		});

		const addButton = getByText(en.address_book.text.add_new_contact);
		await fireEvent.click(addButton);

		expect(mockAddContact).toHaveBeenCalledTimes(1);
	});

	it('should render contacts list when there are contacts', () => {
		const { getByText, getAllByText } = render(AddressBookStep, {
			props: {
				contacts: mockContacts,
				addContact: mockAddContact,
				showContact: mockShowContact
			}
		});

		// Should show the add contact button
		const addButton = getByText(en.address_book.text.add_contact);

		expect(addButton).toBeInTheDocument();

		// Should display each contact
		mockContacts.forEach((contact) => {
			expect(
				getByText(`CONTACT: ${contact.name} #addresses ${contact.addresses.length}`)
			).toBeInTheDocument();
		});

		// Should have a Show button for each contact
		const showButtons = getAllByText('Show');

		expect(showButtons).toHaveLength(mockContacts.length);
	});

	it('should call addContact when add contact button is clicked in contacts list', async () => {
		const { getByTestId } = render(AddressBookStep, {
			props: {
				contacts: mockContacts,
				addContact: mockAddContact,
				showContact: mockShowContact
			}
		});

		const addButton = getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON);
		await fireEvent.click(addButton);

		expect(mockAddContact).toHaveBeenCalledTimes(1);
	});

	it('should call showContact with the correct contact when Show button is clicked', async () => {
		const { getAllByText } = render(AddressBookStep, {
			props: {
				contacts: mockContacts,
				addContact: mockAddContact,
				showContact: mockShowContact
			}
		});

		const showButtons = getAllByText('Show');

		// Click the first contact's Show button
		await fireEvent.click(showButtons[0]);

		expect(mockShowContact).toHaveBeenCalledTimes(1);
		expect(mockShowContact).toHaveBeenCalledWith(mockContacts[0]);

		// Click the second contact's Show button
		await fireEvent.click(showButtons[1]);

		expect(mockShowContact).toHaveBeenCalledTimes(2);
		expect(mockShowContact).toHaveBeenCalledWith(mockContacts[1]);
	});
});
