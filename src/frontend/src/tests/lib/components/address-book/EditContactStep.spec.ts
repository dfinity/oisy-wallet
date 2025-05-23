import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
import {
	CONTACT_EDIT_ADD_ADDRESS_BUTTON,
	CONTACT_EDIT_DELETE_CONTACT_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mocks';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('EditContactStep', () => {
	const mockAddress1: ContactAddressUi = {
		address: mockEthAddress,
		addressType: 'Eth'
	};

	const mockAddress2: ContactAddressUi = {
		address: mockEthAddress2,
		addressType: 'Eth',
		label: 'My ETH Address'
	};

	const mockContact: ContactUi = {
		id: BigInt(1),
		name: 'Test Contact',
		addresses: [mockAddress1, mockAddress2],
		updateTimestampNs: BigInt(Date.now())
	};

	it('should render the edit contact step with contact information', () => {
		const onClose = vi.fn();
		const onEdit = vi.fn();
		const onEditAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onDeleteContact = vi.fn();
		const onDeleteAddress = vi.fn();

		const { getByText, getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose,
				onEdit,
				onEditAddress,
				onAddAddress,
				onDeleteContact,
				onDeleteAddress
			}
		});

		// Check that the contact name is displayed
		expect(getByText('Test Contact')).toBeInTheDocument();

		// Check that the addresses are displayed
		expect(getByText(`ADDRESS: ${mockEthAddress}`)).toBeInTheDocument();
		expect(getByText(`ADDRESS: ${mockEthAddress2} My ETH Address`)).toBeInTheDocument();

		// Check that the close button is rendered
		expect(getByTestId(CONTACT_SHOW_CLOSE_BUTTON)).toBeInTheDocument();

		// Check that the add address button is rendered
		expect(getByText(en.address_book.edit_contact.add_address)).toBeInTheDocument();

		// Check that the delete contact button is rendered
		expect(getByText(en.address_book.edit_contact.delete_contact)).toBeInTheDocument();
	});

	it('should call onClose when close button is clicked', async () => {
		const onClose = vi.fn();
		const onEdit = vi.fn();

		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose,
				onEdit
			}
		});

		// Click the close button
		const closeButton = getByTestId(CONTACT_SHOW_CLOSE_BUTTON);
		await fireEvent.click(closeButton);

		// Check that onClose was called
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it('should call onEdit when contact header is clicked', async () => {
		const onEdit = vi.fn();

		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: vi.fn(),
				onEdit
			}
		});

		// Click the contact header edit button
		const editButton = getByTestId('contact-header-editing-edit-button');
		await fireEvent.click(editButton);

		// Check that onEdit was called with the contact
		expect(onEdit).toHaveBeenCalledTimes(1);
		expect(onEdit).toHaveBeenCalledWith(mockContact);
	});

	it('should call onEditAddress when edit button for an address is clicked', async () => {
		const onEditAddress = vi.fn();
		const onEdit = vi.fn();

		const { getAllByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: vi.fn(),
				onEdit,
				onEditAddress
			}
		});

		// Click the edit button for the first address
		const editButtons = getAllByText('Edit');
		await fireEvent.click(editButtons[0]);

		// Check that onEditAddress was called with the address
		expect(onEditAddress).toHaveBeenCalledTimes(1);
		expect(onEditAddress).toHaveBeenCalledWith(mockAddress1);
	});

	it('should call deleteAddress when delete button for an address is clicked', async () => {
		const onDeleteAddress = vi.fn();
		const onEdit = vi.fn();

		const { getAllByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: vi.fn(),
				onEdit,
				onDeleteAddress
			}
		});

		// Click the delete button for the first address
		const deleteButtons = getAllByText('Delete');
		await fireEvent.click(deleteButtons[0]);

		// Check that deleteAddress was called with the address index
		expect(onDeleteAddress).toHaveBeenCalledTimes(1);
		expect(onDeleteAddress).toHaveBeenCalledWith(0);
	});

	it('should call onAddAddress when add address button is clicked', async () => {
		const onAddAddress = vi.fn();
		const onEdit = vi.fn();

		const { getByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: vi.fn(),
				onEdit,
				onAddAddress
			}
		});

		// Click the add address button
		const addButton = getByText(en.address_book.edit_contact.add_address);
		await fireEvent.click(addButton);

		// Check that onAddAddress was called
		expect(onAddAddress).toHaveBeenCalledTimes(1);
	});

	it('should call onDeleteContact when delete contact button is clicked', async () => {
		const onDeleteContact = vi.fn();
		const onEdit = vi.fn();

		const { getByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: vi.fn(),
				onEdit,
				onDeleteContact
			}
		});

		// Click the delete contact button
		const deleteButton = getByText(en.address_book.edit_contact.delete_contact);
		await fireEvent.click(deleteButton);

		// Check that onDeleteContact was called with the contact id
		expect(onDeleteContact).toHaveBeenCalledTimes(1);
		expect(onDeleteContact).toHaveBeenCalledWith(mockContact.id);
	});

	it('should disable buttons when corresponding functions are not provided', () => {
		const onEdit = vi.fn();

		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				onClose: vi.fn(),
				onEdit
			}
		});

		// Check that the add address button is disabled
		const addButton = getByTestId(CONTACT_EDIT_ADD_ADDRESS_BUTTON);

		expect(addButton).toBeDisabled();

		// Check that the delete contact button is disabled
		const deleteButton = getByTestId(CONTACT_EDIT_DELETE_CONTACT_BUTTON);

		expect(deleteButton).toBeDisabled();
	});
});
