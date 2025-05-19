import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
import {
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_SEARCH_CONTACT_INPUT
} from '$lib/constants/test-ids.constants';
import type { Contact } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('AddressBookStep', () => {
	const baseContacts: Contact[] = [
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
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
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
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const addButton = getByText(en.address_book.text.add_new_contact);
		await fireEvent.click(addButton);

		expect(mockAddContact).toHaveBeenCalledTimes(1);
	});

	it('should render contacts list when there are contacts', () => {
		const { getByText, getAllByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		// Should show the add contact button
		expect(getByText(en.address_book.text.add_contact)).toBeInTheDocument();

		// Should display each contact
		baseContacts.forEach((contact) => {
			expect(
				getByText(`CONTACT: ${contact.name} #addresses ${contact.addresses.length}`)
			).toBeInTheDocument();
		});

		// Should have a Show button for each contact
		const showButtons = getAllByText('Show');

		expect(showButtons).toHaveLength(baseContacts.length);
	});

	it('should call addContact when add contact button is clicked in contacts list', async () => {
		const { getByTestId } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const addButton = getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON);
		await fireEvent.click(addButton);

		expect(mockAddContact).toHaveBeenCalledTimes(1);
	});

	it('should call showContact with the correct contact when Show button is clicked', async () => {
		const { getAllByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const showButtons = getAllByText('Show');

		// Click the first contact's Show button
		await fireEvent.click(showButtons[0]);

		expect(mockShowContact).toHaveBeenCalledWith(baseContacts[0]);

		// Click the second contact's Show button
		await fireEvent.click(showButtons[1]);

		expect(mockShowContact).toHaveBeenCalledWith(baseContacts[1]);
	});

	it('should filter contacts when typing in the search input', async () => {
		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT) as HTMLInputElement;

		expect(input).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Contact 1' } });

		expect(queryByText('CONTACT: Test Contact 1 #addresses 1')).toBeInTheDocument();
		expect(queryByText('CONTACT: Test Contact 2 #addresses 0')).not.toBeInTheDocument();

		await fireEvent.input(input, { target: { value: '' } });

		expect(queryByText('CONTACT: Test Contact 1 #addresses 1')).toBeInTheDocument();
		expect(queryByText('CONTACT: Test Contact 2 #addresses 0')).toBeInTheDocument();
	});

	it('should support partial multi-word matching', async () => {
		const contacts = [...baseContacts, { id: 'contact-3', name: 'Jane Smith', addresses: [] }];

		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: 'jan smi' } });

		expect(queryByText('CONTACT: Jane Smith #addresses 0')).toBeInTheDocument();
		expect(queryByText('CONTACT: Test Contact 1 #addresses 1')).not.toBeInTheDocument();
	});

	it('should support case-insensitive and trimmed matching', async () => {
		const contacts = [...baseContacts, { id: 'contact-4', name: 'Case Sensitive', addresses: [] }];

		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: '   case   senSITive  ' } });

		expect(queryByText('CONTACT: Case Sensitive #addresses 0')).toBeInTheDocument();
	});

	it('should match contact by emoji', async () => {
		const contacts = [...baseContacts, { id: 'contact-5', name: 'Test 😀 Contact', addresses: [] }];

		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: '😀' } });

		expect(queryByText('CONTACT: Test 😀 Contact #addresses 0')).toBeInTheDocument();
	});

	it('should display no results message for unmatched input', async () => {
		const { getByTestId, getByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: 'Nonexistent' } });

		expect(getByText(en.address_book.text.no_contact_found)).toBeInTheDocument();
	});
});
