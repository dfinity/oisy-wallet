import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
import {
	CONTACT_HEADER_EDIT_BUTTON,
	CONTACT_SHOW_ADD_ADDRESS_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { Contact } from '$lib/types/contact';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('ShowContactStep', () => {
	const mockContact: Contact = {
		id: 'contact-1',
		name: 'Test Contact',
		addresses: []
	};

	const mockContactWithAddresses: Contact = {
		id: 'contact-2',
		name: 'Contact With Addresses',
		addresses: [
			{
				address: '0x123456789abcdef',
				alias: 'My ETH Address',
				addressType: 'Eth'
			},
			{
				address: 'btc123456789abcdef',
				alias: 'My BTC Address',
				addressType: 'Btc'
			}
		]
	};

	const mockClose = vi.fn();
	const mockAddAddress = vi.fn();
	const mockShowAddress = vi.fn();
	const mockEdit = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render empty state when contact has no addresses', () => {
		const { getByText, getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose
			}
		});

		// Check that the contact name is displayed
		expect(getByText(mockContact.name)).toBeInTheDocument();

		// Check that the empty state message is displayed
		expect(getByText(en.address_book.show_contact.show_address_text)).toBeInTheDocument();

		const expectedText = replacePlaceholders(en.address_book.show_contact.add_first_address, {
			contactName: mockContact.name
		});

		expect(getByText(expectedText)).toBeInTheDocument();

		// Check that the add address button is present but disabled (since no addAddress prop was provided)
		const addAddressButton = getByTestId(CONTACT_SHOW_ADD_ADDRESS_BUTTON);

		expect(addAddressButton).toBeInTheDocument();
		expect(addAddressButton).toBeDisabled();
		expect(addAddressButton).toHaveTextContent(en.address_book.show_contact.add_address);
	});

	it('should enable add address button when addAddress prop is provided', () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onAddAddress: mockAddAddress
			}
		});

		const addAddressButton = getByTestId(CONTACT_SHOW_ADD_ADDRESS_BUTTON);

		expect(addAddressButton).toBeInTheDocument();

		expect(addAddressButton).not.toBeDisabled();
	});

	it('should call close function when close button is clicked', async () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose
			}
		});

		const closeButton = getByTestId(CONTACT_SHOW_CLOSE_BUTTON);
		await fireEvent.click(closeButton);

		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('should call addAddress function when add address button is clicked', async () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onAddAddress: mockAddAddress
			}
		});

		const addAddressButton = getByTestId(CONTACT_SHOW_ADD_ADDRESS_BUTTON);
		await fireEvent.click(addAddressButton);

		expect(mockAddAddress).toHaveBeenCalledTimes(1);
	});

	it('should render addresses when contact has addresses', () => {
		const { getByText } = render(ShowContactStep, {
			props: {
				contact: mockContactWithAddresses,
				onClose: mockClose
			}
		});

		// Check that the contact name is displayed
		expect(getByText(mockContactWithAddresses.name)).toBeInTheDocument();

		// Check that each address is displayed
		mockContactWithAddresses.addresses.forEach((address) => {
			expect(getByText(`ADDRESS: ${address.address} ${address.alias}`)).toBeInTheDocument();
		});
	});

	it('should show address buttons when showAddress prop is provided', async () => {
		const { getAllByText } = render(ShowContactStep, {
			props: {
				contact: mockContactWithAddresses,
				onClose: mockClose,
				onShowAddress: mockShowAddress
			}
		});

		// Check that show buttons are displayed for each address
		const showButtons = getAllByText('Show');

		expect(showButtons).toHaveLength(mockContactWithAddresses.addresses.length);

		// Click the first show button
		await fireEvent.click(showButtons[0]);

		// Check that showAddress was called with the correct address
		expect(mockShowAddress).toHaveBeenCalledTimes(1);
		expect(mockShowAddress).toHaveBeenCalledWith(mockContactWithAddresses.addresses[0]);
	});

	it('should call edit function when edit button is clicked', async () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit
			}
		});

		// Find the edit button in the ContactHeader component
		const editButton = getByTestId(CONTACT_HEADER_EDIT_BUTTON);
		await fireEvent.click(editButton);

		expect(mockEdit).toHaveBeenCalledTimes(1);
		expect(mockEdit).toHaveBeenCalledWith(mockContact);
	});
});
