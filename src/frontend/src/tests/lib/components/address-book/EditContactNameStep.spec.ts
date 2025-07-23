import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
import {
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, waitFor } from '@testing-library/svelte';

describe('EditContactNameStep', () => {
	it('should render the add contact step with form and buttons', () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		// Check that the form is rendered
		expect(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT)).toBeInTheDocument();

		// Check that the buttons are rendered
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON)).toBeInTheDocument();

		// Check that the save button has the correct text
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toHaveTextContent(en.core.text.save);
	});

	it('should disable save button when form is invalid', () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		// Check that the save button is disabled initially
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeDisabled();
	});

	it('should enable save button when form is valid', async () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		// Enter a name to make the form valid
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Check that the save button is enabled
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).not.toBeDisabled();
	});

	it('should call addContact when save button is clicked with isNewContact=true', async () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		// Enter a name to make the form valid
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Click the save button
		const saveButton = getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// Check that addContact was called with the correct contact
		expect(onAddContact).toHaveBeenCalledOnce();
		expect(onAddContact).toHaveBeenCalledWith(expect.objectContaining({ name: 'Test Contact' }));
	});

	it('should call addContact with full contact when save button is clicked with isNewContact=false', async () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();
		const contact: Partial<ContactUi> = { name: 'Test Contact' };

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: false, contact }
		});

		// Click the save button
		const saveButton = getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// Check that addContact was called with the full contact
		expect(onSaveContact).toHaveBeenCalledOnce();
		expect(onSaveContact).toHaveBeenCalledWith(contact);
	});

	it('should call close when cancel button is clicked', async () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		// Click the cancel button
		const cancelButton = getByTestId(ADDRESS_BOOK_CANCEL_BUTTON);
		await fireEvent.click(cancelButton);

		// Check that close was called
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('should update title when contact name changes', async () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId, getByLabelText } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		const defaultLabel = en.address_book.avatar.default;

		expect(getByLabelText(defaultLabel)).toBeInTheDocument();

		// Type name
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Expect aria-label to update
		await waitFor(() => {
			expect(
				getByLabelText(`${en.address_book.avatar.avatar_for} Test Contact`)
			).toBeInTheDocument();
		});

		// Clear the name by actually removing all characters
		await fireEvent.input(nameInput, { target: { value: '' } });

		await waitFor(() => {
			expect(getByLabelText(defaultLabel)).toBeInTheDocument();
		});
	});

	it('should trim leading spaces before calling onAddContact', async () => {
		const onAddContact = vi.fn();
		const onSaveContact = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditContactNameStep, {
			props: { onAddContact, onSaveContact, onClose, isNewContact: true }
		});

		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: '   Test Name' } });

		const saveButton = getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		expect(onAddContact).toHaveBeenCalledOnce();
		expect(onAddContact).toHaveBeenCalledWith({ name: 'Test Name' }); // No leading space
	});
});
