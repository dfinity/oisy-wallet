import EditContactNameStep from '$lib/components/address-book/EditContactNameStep.svelte';
import {
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { Contact } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('EditContactNameStep', () => {
	const mockAddContact = vi.fn();
	const mockSaveContact = vi.fn();
	const mockClose = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should render the component with avatar and contact form', () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Check that the avatar and form are rendered
		expect(screen.getByText('Name')).toBeInTheDocument();
		expect(screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT)).toBeInTheDocument();
		expect(screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeInTheDocument();
		expect(screen.getByTestId(ADDRESS_BOOK_CANCEL_BUTTON)).toBeInTheDocument();
	});

	it('should have save button disabled when form is invalid', () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Save button should be disabled initially (empty form)
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);

		expect(saveButton).toBeDisabled();
	});

	it('should enable save button when form is valid', async () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Enter a name to make the form valid
		const nameInput = screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Save button should be enabled
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);

		expect(saveButton).not.toBeDisabled();
	});

	it('should call addContact when adding a new contact', async () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Enter a name to make the form valid
		const nameInput = screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Click save button
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// addContact should be called with the contact data
		expect(mockAddContact).toHaveBeenCalledTimes(1);
		expect(mockAddContact).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'Test Contact',
				addresses: []
			})
		);
		expect(mockSaveContact).not.toHaveBeenCalled();
	});

	it('should call saveContact when editing an existing contact with ID', async () => {
		// Create a contact with an ID to simulate editing
		const existingContact: Partial<Contact> = {
			id: '123',
			name: 'Existing Contact',
			addresses: []
		};

		render(EditContactNameStep, {
			props: {
				contact: existingContact,
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Update the name
		const nameInput = screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Updated Contact' } });

		// Click save button
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// saveContact should be called with the updated contact data
		expect(mockSaveContact).toHaveBeenCalledTimes(1);
		expect(mockSaveContact).toHaveBeenCalledWith(
			expect.objectContaining({
				id: '123',
				name: 'Updated Contact',
				addresses: []
			})
		);
		expect(mockAddContact).not.toHaveBeenCalled();
	});

	it('should call close when cancel button is clicked', async () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Click cancel button
		const cancelButton = screen.getByTestId(ADDRESS_BOOK_CANCEL_BUTTON);
		await fireEvent.click(cancelButton);

		// close should be called
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('should not call addContact or saveContact when form is invalid', async () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Form is invalid (no name entered)
		// Try to click save button (it should be disabled, but we'll try anyway)
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// Neither addContact nor saveContact should be called
		expect(mockAddContact).not.toHaveBeenCalled();
		expect(mockSaveContact).not.toHaveBeenCalled();
	});

	it('should initialize with empty contact when no contact is provided', () => {
		render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		// Save button should be disabled (empty form)
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);

		expect(saveButton).toBeDisabled();
	});

	it('should initialize with provided contact', () => {
		const initialContact: Partial<Contact> = {
			name: 'Initial Contact',
			addresses: []
		};

		const { component } = render(EditContactNameStep, {
			props: {
				contact: initialContact,
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		expect(component.title).toBe('Initial Contact');

		// Save button should be enabled (valid form)
		const saveButton = screen.getByTestId(ADDRESS_BOOK_SAVE_BUTTON);

		expect(saveButton).not.toBeDisabled();
	});

	it('should display the correct title based on contact name', async () => {
		const { component } = render(EditContactNameStep, {
			props: {
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		expect(component.title).toBe(en.contact.form.add_new_contact);

		// Enter a name
		const nameInput = screen.getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Title should update to the contact name

		expect(component.title).toBe('Test Contact');
	});

	it('should display the correct title for existing contact', () => {
		const existingContact: Partial<Contact> = {
			id: '123',
			name: 'Existing Contact',
			addresses: []
		};

		const { component } = render(EditContactNameStep, {
			props: {
				contact: existingContact,
				addContact: mockAddContact,
				saveContact: mockSaveContact,
				close: mockClose
			}
		});

		expect(component.title).toBe(en.contact.form.edit_contact);
	});
});
