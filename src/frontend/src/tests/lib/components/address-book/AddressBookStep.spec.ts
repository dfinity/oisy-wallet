import AddressBookStep from '$lib/components/address-book/AddressBookStep.svelte';
import {
	ADDRESS_BOOK_ADD_CONTACT_BUTTON,
	ADDRESS_BOOK_SEARCH_CONTACT_INPUT,
	ADDRESS_LIST_ITEM_INFO_BUTTON,
	CONTACT_CARD,
	CONTACT_CARD_BUTTON,
	TOKEN_SKELETON_TEXT
} from '$lib/constants/test-ids.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('AddressBookStep', () => {
	const baseContacts: ContactUi[] = [
		{
			id: 1n,
			name: 'Test Contact 1',
			addresses: [
				{
					address: mockEthAddress,
					label: 'My ETH Address',
					addressType: 'Eth'
				}
			],
			updateTimestampNs: BigInt(Date.now())
		},
		{
			id: 2n,
			name: 'Test Contact 2',
			addresses: [],
			updateTimestampNs: BigInt(Date.now())
		}
	];
	const mockAddContact = vi.fn();
	const mockShowContact = vi.fn();
	const mockShowAddress = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		contactsStore.set([]);
	});

	it('should render skeletons when contact store is not initialised yet.', () => {
		contactsStore.reset();

		const { getAllByTestId } = render(AddressBookStep, {
			props: {
				contacts: [],
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const skeletonTexts = getAllByTestId(TOKEN_SKELETON_TEXT);

		expect(skeletonTexts).toHaveLength(6);
	});

	it('should render empty state when there are no contacts', () => {
		const { getByText } = render(AddressBookStep, {
			props: {
				contacts: [],
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
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
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const addButton = getByText(en.address_book.text.add_new_contact);
		await fireEvent.click(addButton);

		expect(mockAddContact).toHaveBeenCalledTimes(1);
	});

	it('should render contacts list when there are contacts', () => {
		const { getByText, getAllByTestId } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		// Should show the add contact button
		expect(getByText(en.address_book.text.add_contact)).toBeInTheDocument();

		// Should display a ContactCard for each contact
		const contactCards = getAllByTestId(CONTACT_CARD);

		expect(contactCards).toHaveLength(baseContacts.length);

		// Should display each contact name
		baseContacts.forEach((contact) => {
			expect(getByText(contact.name)).toBeInTheDocument();
		});
	});

	it('should call addContact when add contact button is clicked in contacts list', async () => {
		const { getByTestId } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const addButton = getByTestId(ADDRESS_BOOK_ADD_CONTACT_BUTTON);
		await fireEvent.click(addButton);

		expect(mockAddContact).toHaveBeenCalledTimes(1);
	});

	it('should call showContact with the correct contact when ContactCard is clicked', async () => {
		const { getAllByTestId } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const contactButtons = getAllByTestId(CONTACT_CARD_BUTTON);

		// Click the first contact's card
		await fireEvent.click(contactButtons[0]);

		expect(mockShowContact).toHaveBeenCalledWith(baseContacts[0]);

		// Click the second contact's card
		await fireEvent.click(contactButtons[1]);

		expect(mockShowContact).toHaveBeenCalledWith(baseContacts[1]);
	});

	it('should call onShowAddress with the correct contact and address index', async () => {
		// Use only the first contact which has an address
		const [contactWithAddress] = baseContacts;

		const { getAllByTestId } = render(AddressBookStep, {
			props: {
				contacts: [contactWithAddress],
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		// Find the info button for the address
		const infoButtons = getAllByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON);

		expect(infoButtons).toHaveLength(1);

		// Click the info button
		await fireEvent.click(infoButtons[0]);

		// Check that onShowAddress was called with the correct parameters
		expect(mockShowAddress).toHaveBeenCalledWith({
			contact: contactWithAddress,
			addressIndex: 0
		});
	});

	it('should filter contacts when typing in the search input', async () => {
		const { getByTestId, queryByText, queryAllByTestId } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT) as HTMLInputElement;

		expect(input).toBeInTheDocument();

		await fireEvent.input(input, { target: { value: 'Contact 1' } });

		// Should show only the first contact
		const filteredCards = queryAllByTestId(CONTACT_CARD);

		expect(filteredCards).toHaveLength(1);
		expect(queryByText('Test Contact 1')).toBeInTheDocument();
		expect(queryByText('Test Contact 2')).not.toBeInTheDocument();

		await fireEvent.input(input, { target: { value: '' } });

		// Should show all contacts again
		expect(queryAllByTestId(CONTACT_CARD)).toHaveLength(2);
		expect(queryByText('Test Contact 1')).toBeInTheDocument();
		expect(queryByText('Test Contact 2')).toBeInTheDocument();
	});

	it('should support partial multi-word matching', async () => {
		const contacts = [
			...baseContacts,
			{
				id: 3n,
				name: 'Jane Smith',
				addresses: [],
				updateTimestampNs: BigInt(Date.now())
			}
		];

		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: 'jan smi' } });

		expect(queryByText('Jane Smith')).toBeInTheDocument();
		expect(queryByText('Test Contact 1')).not.toBeInTheDocument();
	});

	it('should support case-insensitive and trimmed matching', async () => {
		const contacts = [
			...baseContacts,
			{
				id: 4n,
				name: 'Case Sensitive',
				addresses: [],
				updateTimestampNs: BigInt(Date.now())
			}
		];

		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: '   case   senSITive  ' } });

		expect(queryByText('Case Sensitive')).toBeInTheDocument();
	});

	it('should match contact by emoji', async () => {
		const contacts = [
			...baseContacts,
			{
				id: 5n,
				name: 'Test 😀 Contact',
				addresses: [],
				updateTimestampNs: BigInt(Date.now())
			}
		];

		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: '😀' } });

		expect(queryByText('Test 😀 Contact')).toBeInTheDocument();
	});

	it('should display no results message for unmatched input', async () => {
		const { getByTestId, getByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: 'Nonexistent' } });

		expect(getByText(en.address_book.text.no_contact_found)).toBeInTheDocument();
	});

	it('should match contact by address', async () => {
		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: mockEthAddress.slice(0, 6) } });

		expect(queryByText('Test Contact 1')).toBeInTheDocument();
		expect(queryByText('Test Contact 2')).not.toBeInTheDocument();
	});

	it('should match contact by address label', async () => {
		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: 'My ETH' } });

		expect(queryByText('Test Contact 1')).toBeInTheDocument();
		expect(queryByText('Test Contact 2')).not.toBeInTheDocument();
	});

	it('should match contact by combined name and alias terms', async () => {
		const { getByTestId, queryByText } = render(AddressBookStep, {
			props: {
				contacts: baseContacts,
				onAddContact: mockAddContact,
				onShowContact: mockShowContact,
				onShowAddress: mockShowAddress
			}
		});

		const input = getByTestId(ADDRESS_BOOK_SEARCH_CONTACT_INPUT);
		await fireEvent.input(input, { target: { value: 'Contact ETH' } });

		expect(queryByText('Test Contact 1')).toBeInTheDocument();
		expect(queryByText('Test Contact 2')).not.toBeInTheDocument();
	});
});
