import EditContactStep from '$lib/components/address-book/EditContactStep.svelte';
import {
	CONTACT_EDIT_ADD_ADDRESS_BUTTON,
	CONTACT_EDIT_DELETE_CONTACT_BUTTON,
	CONTACT_SHOW_CLOSE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { Address, Contact } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('EditContactStep', () => {
	const mockAddress1: Address = {
		id: 'address-1',
		address: 'test-address-1'
	};

	const mockAddress2: Address = {
		id: 'address-2',
		address: 'test-address-2',
		alias: 'My ETH Address'
	};

	const mockContact: Contact = {
		id: 'test-id',
		name: 'Test Contact',
		addresses: [mockAddress1, mockAddress2]
	};

	it('should render the edit contact step with contact information', () => {
		const close = vi.fn();
		const edit = vi.fn();
		const editAddress = vi.fn();
		const addAddress = vi.fn();
		const deleteContact = vi.fn();
		const deleteAddress = vi.fn();

		const { getByText, getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close,
				edit,
				editAddress,
				addAddress,
				deleteContact,
				deleteAddress
			}
		});

		// Check that the contact name is displayed
		expect(getByText('Test Contact')).toBeInTheDocument();

		// Check that the addresses are displayed
		expect(getByText(/ADDRESS: test-address-1/)).toBeInTheDocument();
		expect(getByText(/ADDRESS: test-address-2 My ETH Address/)).toBeInTheDocument();

		// Check that the close button is rendered
		expect(getByTestId(CONTACT_SHOW_CLOSE_BUTTON)).toBeInTheDocument();

		// Check that the add address button is rendered
		expect(getByText(en.address_book.edit_contact.add_address)).toBeInTheDocument();

		// Check that the delete contact button is rendered
		expect(getByText(en.address_book.edit_contact.delete_contact)).toBeInTheDocument();
	});

	it('should call close when close button is clicked', async () => {
		const close = vi.fn();

		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close
			}
		});

		// Click the close button
		const closeButton = getByTestId(CONTACT_SHOW_CLOSE_BUTTON);
		await fireEvent.click(closeButton);

		// Check that close was called
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('should call edit when contact header is clicked', async () => {
		const edit = vi.fn();

		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close: vi.fn(),
				edit
			}
		});

		// Click the contact header edit button
		const editButton = getByTestId('contact-header-editing-edit-button');
		await fireEvent.click(editButton);

		// Check that edit was called with the contact
		expect(edit).toHaveBeenCalledTimes(1);
		expect(edit).toHaveBeenCalledWith(mockContact);
	});

	it('should call editAddress when edit button for an address is clicked', async () => {
		const editAddress = vi.fn();

		const { getAllByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close: vi.fn(),
				editAddress
			}
		});

		// Click the edit button for the first address
		const editButtons = getAllByText('Edit');
		await fireEvent.click(editButtons[0]);

		// Check that editAddress was called with the address
		expect(editAddress).toHaveBeenCalledTimes(1);
		expect(editAddress).toHaveBeenCalledWith(mockAddress1);
	});

	it('should call deleteAddress when delete button for an address is clicked', async () => {
		const deleteAddress = vi.fn();

		const { getAllByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close: vi.fn(),
				deleteAddress
			}
		});

		// Click the delete button for the first address
		const deleteButtons = getAllByText('Delete');
		await fireEvent.click(deleteButtons[0]);

		// Check that deleteAddress was called with the address id
		expect(deleteAddress).toHaveBeenCalledTimes(1);
		expect(deleteAddress).toHaveBeenCalledWith(mockAddress1.id);
	});

	it('should call addAddress when add address button is clicked', async () => {
		const addAddress = vi.fn();

		const { getByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close: vi.fn(),
				addAddress
			}
		});

		// Click the add address button
		const addButton = getByText(en.address_book.edit_contact.add_address);
		await fireEvent.click(addButton);

		// Check that addAddress was called
		expect(addAddress).toHaveBeenCalledTimes(1);
	});

	it('should call deleteContact when delete contact button is clicked', async () => {
		const deleteContact = vi.fn();

		const { getByText } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close: vi.fn(),
				deleteContact
			}
		});

		// Click the delete contact button
		const deleteButton = getByText(en.address_book.edit_contact.delete_contact);
		await fireEvent.click(deleteButton);

		// Check that deleteContact was called with the contact id
		expect(deleteContact).toHaveBeenCalledTimes(1);
		expect(deleteContact).toHaveBeenCalledWith(mockContact.id);
	});

	it('should disable buttons when corresponding functions are not provided', () => {
		const { getByTestId } = render(EditContactStep, {
			props: {
				contact: mockContact,
				close: vi.fn()
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
