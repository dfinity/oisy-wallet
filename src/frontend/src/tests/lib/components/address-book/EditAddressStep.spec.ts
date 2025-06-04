import EditAddressStep from '$lib/components/address-book/EditAddressStep.svelte';
import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADDRESS_ALIAS_INPUT,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import type { ContactAddressUi, ContactUi } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('EditAddressStep', () => {
	const mockContact: ContactUi = {
		id: 1n,
		name: 'Test Contact',
		addresses: [],
		updateTimestampNs: BigInt(Date.now())
	};

	it('should render the edit address step with form and buttons', () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true
			}
		});

		// Check that the form is rendered
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT)).toBeInTheDocument();

		// Check that the buttons are rendered
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON)).toBeInTheDocument();

		// Check that the save button has the correct text
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toHaveTextContent(en.core.text.save);
	});

	it('should display the contact name', () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true
			}
		});

		// Check that the contact name is displayed
		expect(screen.getByText(mockContact.name)).toBeInTheDocument();
	});

	it('should disable save button when form is invalid', () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true
			}
		});

		// Check that the save button is disabled initially
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeDisabled();
	});

	it('should enable save button when form is valid', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true,
				address
			}
		});

		// Enter a valid Ethereum address to make the form valid
		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, {
			target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
		});

		// Check that the save button is enabled
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).not.toBeDisabled();
	});

	it('should call onAddAddress when save button is clicked with isNewAddress=true', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true,
				address
			}
		});

		// Enter a valid Ethereum address to make the form valid
		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, {
			target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
		});

		// Enter a label
		const labelInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		await fireEvent.input(labelInput, { target: { value: 'Test Address' } });

		// Click the save button
		const saveButton = getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// Check that onAddAddress was called with the correct address
		expect(onAddAddress).toHaveBeenCalled();
		expect(onAddAddress).toHaveBeenCalledWith(
			expect.objectContaining({
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				addressType: 'Eth',
				label: 'Test Address'
			})
		);
	});

	it('should call onSaveAddress when save button is clicked with isNewAddress=false', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();
		const address: Partial<ContactAddressUi> = {
			address: 'icp:abcdefghijklmnopqrstuvwxyz',
			label: 'Test Address'
		};

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: false,
				address
			}
		});

		// Click the save button
		const saveButton = getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// Check that onSaveAddress was called with the correct address
		expect(onSaveAddress).toHaveBeenCalled();
		expect(onSaveAddress).toHaveBeenCalledWith(address);
	});

	it('should call onClose when cancel button is clicked', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true
			}
		});

		// Click the cancel button
		const cancelButton = getByTestId(ADDRESS_BOOK_CANCEL_BUTTON);
		await fireEvent.click(cancelButton);

		// Check that onClose was called
		expect(onClose).toHaveBeenCalled();
	});

	it('should display reset buttons for address and label fields when not disabled', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true
			}
		});

		// Enter values into the address and alias fields to trigger the display of reset buttons
		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		const aliasInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);

		await fireEvent.input(addressInput, { target: { value: '0x1234567890abcdef' } });
		await fireEvent.input(aliasInput, { target: { value: 'My Wallet' } });

		const resetButtons = screen.getAllByRole('button', { name: 'Reset input value' });

		// Assert that two reset buttons are present
		expect(resetButtons).toHaveLength(2);
	});

	it('should submit the form when Enter is pressed in the address input', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId, container } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onClose,
				isNewAddress: true
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, {
			target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
		});

		const form = container.querySelector('form');
		if (!form) {
			throw new Error('Form element not found');
		}

		await fireEvent.submit(form);

		expect(onAddAddress).toHaveBeenCalled();
	});
});
