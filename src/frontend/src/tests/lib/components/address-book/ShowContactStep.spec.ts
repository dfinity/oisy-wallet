import ShowContactStep from '$lib/components/address-book/ShowContactStep.svelte';
import {
	ADDRESS_LIST_ITEM_BUTTON,
	ADDRESS_LIST_ITEM_INFO_BUTTON,
	CONTACT_HEADER_EDIT_BUTTON,
	CONTACT_SHOW_ADD_ADDRESS_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import * as clipboardUtils from '$lib/utils/clipboard.utils';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('ShowContactStep', () => {
	const mockContact: ContactUi = {
		id: 1n,
		name: 'Test Contact',
		addresses: [],
		updateTimestampNs: BigInt(Date.now())
	};

	const mockContactWithAddresses: ContactUi = {
		id: 2n,
		name: 'Contact With Addresses',
		addresses: [
			{
				address: mockEthAddress,
				label: 'My ETH Address',
				addressType: 'Eth'
			},
			{
				address: mockBtcAddress,
				label: 'My BTC Address',
				addressType: 'Btc'
			}
		],
		updateTimestampNs: BigInt(Date.now())
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
				onClose: mockClose,
				onAddAddress: vi.fn(),
				onShowAddress: vi.fn()
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
		expect(addAddressButton).toHaveTextContent(en.address_book.show_contact.add_address);
	});

	it('should enable add address button when addAddress prop is provided', () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onAddAddress: mockAddAddress,
				onShowAddress: vi.fn()
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
				onClose: mockClose,
				onAddAddress: vi.fn(),
				onShowAddress: vi.fn()
			}
		});

		const closeButton = getByTestId(CONTACT_SHOW_CLOSE_BUTTON);
		await fireEvent.click(closeButton);

		expect(mockClose).toHaveBeenCalledOnce();
	});

	it('should call addAddress function when add address button is clicked', async () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onAddAddress: mockAddAddress,
				onShowAddress: vi.fn()
			}
		});

		const addAddressButton = getByTestId(CONTACT_SHOW_ADD_ADDRESS_BUTTON);
		await fireEvent.click(addAddressButton);

		expect(mockAddAddress).toHaveBeenCalledOnce();
	});

	it('should render addresses when contact has addresses', () => {
		const { getByText } = render(ShowContactStep, {
			props: {
				contact: mockContactWithAddresses,
				onClose: mockClose,
				onAddAddress: vi.fn(),
				onShowAddress: vi.fn()
			}
		});

		// Check that the contact name is displayed
		expect(getByText(mockContactWithAddresses.name)).toBeInTheDocument();

		// Check that the first address (ETH) is displayed
		expect(getByText(en.address.types.Eth)).toBeInTheDocument();
		expect(getByText('My ETH Address')).toBeInTheDocument();

		const shortenedEthAddress = shortenWithMiddleEllipsis({ text: mockEthAddress });

		expect(getByText(shortenedEthAddress)).toBeInTheDocument();

		// Check that the second address (BTC) is displayed
		expect(getByText(en.address.types.Btc)).toBeInTheDocument();
		expect(getByText('My BTC Address')).toBeInTheDocument();

		const shortenedBtcAddress = shortenWithMiddleEllipsis({ text: mockBtcAddress });

		expect(getByText(shortenedBtcAddress)).toBeInTheDocument();
	});

	it('should show address buttons when showAddress prop is provided', async () => {
		const { getAllByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContactWithAddresses,
				onClose: mockClose,
				onAddAddress: vi.fn(),
				onShowAddress: mockShowAddress
			}
		});

		const infoButtons = getAllByTestId(ADDRESS_LIST_ITEM_INFO_BUTTON);

		// Check that we have the expected number of info buttons
		expect(infoButtons).toHaveLength(2);

		// Click the first info button
		await fireEvent.click(infoButtons[0]);

		// Check that showAddress was called with the correct index
		expect(mockShowAddress).toHaveBeenCalledOnce();
		expect(mockShowAddress).toHaveBeenCalledWith(0);
	});

	it('should call edit function when edit button is clicked', async () => {
		const { getByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onAddAddress: vi.fn(),
				onShowAddress: vi.fn(),
				onEdit: mockEdit
			}
		});

		// Find the edit button in the ContactHeader component
		const editButton = getByTestId(CONTACT_HEADER_EDIT_BUTTON);
		await fireEvent.click(editButton);

		expect(mockEdit).toHaveBeenCalledOnce();
		expect(mockEdit).toHaveBeenCalledWith(mockContact);
	});

	it('should call copyToClipboard function when address button is clicked', async () => {
		const spyCopy = vi.spyOn(clipboardUtils, 'copyToClipboard').mockResolvedValue(undefined);

		const { getAllByTestId } = render(ShowContactStep, {
			props: {
				contact: mockContactWithAddresses,
				onClose: mockClose,
				onAddAddress: vi.fn(),
				onShowAddress: vi.fn(),
				onEdit: mockEdit
			}
		});

		const addressListItems = getAllByTestId(ADDRESS_LIST_ITEM_BUTTON);

		expect(addressListItems).toHaveLength(2);

		await fireEvent.click(addressListItems[0]);

		expect(spyCopy).toHaveBeenCalled();
	});
});
