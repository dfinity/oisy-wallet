import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
import {
	ADDRESS_LIST_ITEM_DELETE_BUTTON,
	ADDRESS_LIST_ITEM_EDIT_BUTTON,
	CONTACT_EDIT_ADD_ADDRESS_BUTTON,
	CONTACT_EDIT_DELETE_CONTACT_BUTTON,
	CONTACT_HEADER_EDITING_EDIT_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

vi.mock('browser-image-compression', () => {
	const mockFn = vi.fn(
		({ file, options: _options }: { file: File; options: unknown }): Promise<File> =>
			Promise.resolve(file)
	);

	(
		mockFn as unknown as {
			getDataUrlFromFile(params: { file: File }): Promise<string>;
		}
	).getDataUrlFromFile = vi.fn(
		({ file: _file }: { file: File }): Promise<string> =>
			Promise.resolve('data:image/png;base64,MOCK')
	);

	return {
		__esModule: true,
		default: mockFn
	};
});

describe('EditContactStep', () => {
	const mockContact: ContactUi = {
		id: 1n,
		name: 'Test Contact',
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
		updateTimestampNs: BigInt(Date.now()),
		image: []
	};

	const mockClose = vi.fn();
	const mockEdit = vi.fn();
	const mockEditAddress = vi.fn();
	const mockAddAddress = vi.fn();
	const mockDeleteContact = vi.fn();
	const mockDeleteAddress = vi.fn();

	const renderComponent = (contact = mockContact) =>
		render(EditContactStep, {
			props: {
				contact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the contact name and addresses', () => {
		const { getByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		// Check that the contact name is displayed
		expect(getByText(mockContact.name)).toBeInTheDocument();

		// Check that addresses are displayed
		expect(getByText(en.address.types.Eth)).toBeInTheDocument();
		expect(getByText('My ETH Address')).toBeInTheDocument();
		expect(getByText(en.address.types.Btc)).toBeInTheDocument();
		expect(getByText('My BTC Address')).toBeInTheDocument();
	});

	it('should call edit function when edit button is clicked', async () => {
		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const editButton = getByTestId(CONTACT_HEADER_EDITING_EDIT_BUTTON);
		await fireEvent.click(editButton);

		expect(mockEdit).toHaveBeenCalledOnce();
		expect(mockEdit).toHaveBeenCalledWith(mockContact);
	});

	it('should call addAddress function when add address button is clicked', async () => {
		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const addAddressButton = getByTestId(CONTACT_EDIT_ADD_ADDRESS_BUTTON);
		await fireEvent.click(addAddressButton);

		expect(mockAddAddress).toHaveBeenCalledOnce();
	});

	it('should call deleteContact function when delete contact button is clicked', async () => {
		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const deleteContactButton = getByTestId(CONTACT_EDIT_DELETE_CONTACT_BUTTON);
		await fireEvent.click(deleteContactButton);

		expect(mockDeleteContact).toHaveBeenCalledOnce();
		expect(mockDeleteContact).toHaveBeenCalledWith(mockContact.id);
	});

	it('should call close function when close button is clicked', async () => {
		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const closeButton = getByTestId(CONTACT_SHOW_CLOSE_BUTTON);
		await fireEvent.click(closeButton);

		expect(mockClose).toHaveBeenCalledOnce();
	});

	it('should call editAddress function when edit address button is clicked', async () => {
		const { getAllByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const editAddressButtons = getAllByTestId(ADDRESS_LIST_ITEM_EDIT_BUTTON);

		// Click the first edit address button
		await fireEvent.click(editAddressButtons[0]);

		expect(mockEditAddress).toHaveBeenCalledOnce();
		expect(mockEditAddress).toHaveBeenCalledWith(0);
	});

	it('should call deleteAddress function when delete address button is clicked', async () => {
		const { getAllByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: mockAddAddress,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const deleteAddressButtons = getAllByTestId(ADDRESS_LIST_ITEM_DELETE_BUTTON);

		// Click the first delete address button
		await fireEvent.click(deleteAddressButtons[0]);

		expect(mockDeleteAddress).toHaveBeenCalledOnce();
		expect(mockDeleteAddress).toHaveBeenCalledWith(0);
	});

	it('should disable add address button when onAddAddress is not provided', () => {
		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: mockClose,
				onEdit: mockEdit,
				onEditAddress: mockEditAddress,
				onAddAddress: null as unknown as () => void,
				onDeleteContact: mockDeleteContact,
				onDeleteAddress: mockDeleteAddress
			}
		});

		const addAddressButton = getByTestId(CONTACT_EDIT_ADD_ADDRESS_BUTTON);

		expect(addAddressButton).toBeDisabled();
	});

	it('renders contact name and addresses', () => {
		const { getByText } = renderComponent();

		expect(getByText(mockContact.name)).toBeInTheDocument();
		expect(getByText(en.address.types.Eth)).toBeInTheDocument();
		expect(getByText('My ETH Address')).toBeInTheDocument();
		expect(getByText(en.address.types.Btc)).toBeInTheDocument();
		expect(getByText('My BTC Address')).toBeInTheDocument();
	});

	it('calls onEdit when edit button clicked', async () => {
		const { getByTestId } = renderComponent();
		await fireEvent.click(getByTestId(CONTACT_HEADER_EDITING_EDIT_BUTTON));

		expect(mockEdit).toHaveBeenCalledOnce();
		expect(mockEdit).toHaveBeenCalledWith(mockContact);
	});

	it('calls onAddAddress when add-address clicked', async () => {
		const { getByTestId } = renderComponent();
		await fireEvent.click(getByTestId(CONTACT_EDIT_ADD_ADDRESS_BUTTON));

		expect(mockAddAddress).toHaveBeenCalledOnce();
	});

	it('calls onDeleteContact when delete-contact clicked', async () => {
		const { getByTestId } = renderComponent();
		await fireEvent.click(getByTestId(CONTACT_EDIT_DELETE_CONTACT_BUTTON));

		expect(mockDeleteContact).toHaveBeenCalledOnce();
		expect(mockDeleteContact).toHaveBeenCalledWith(mockContact.id);
	});

	it('calls onClose when close button clicked', async () => {
		const { getByTestId } = renderComponent();
		await fireEvent.click(getByTestId(CONTACT_SHOW_CLOSE_BUTTON));

		expect(mockClose).toHaveBeenCalledOnce();
	});

	it('calls onEditAddress when edit-address clicked', async () => {
		const { getAllByTestId } = renderComponent();
		await fireEvent.click(getAllByTestId(ADDRESS_LIST_ITEM_EDIT_BUTTON)[0]);

		expect(mockEditAddress).toHaveBeenCalledOnce();
		expect(mockEditAddress).toHaveBeenCalledWith(0);
	});

	it('calls onDeleteAddress when delete-address clicked', async () => {
		const { getAllByTestId } = renderComponent();
		await fireEvent.click(getAllByTestId(ADDRESS_LIST_ITEM_DELETE_BUTTON)[0]);

		expect(mockDeleteAddress).toHaveBeenCalledOnce();
		expect(mockDeleteAddress).toHaveBeenCalledWith(0);
	});
});
