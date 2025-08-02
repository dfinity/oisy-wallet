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

describe('EditAddressStep', () => {
	const mockContact: ContactUi = {
		id: 1n,
		name: 'Test Contact',
		addresses: [],
		updateTimestampNs: BigInt(Date.now())
	};

	const onQRCodeScan = vi.fn(); // ✅ NEW SHARED MOCK

	it('should render the edit address step with form and buttons', () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onQRCodeScan,
				onClose,
				isNewAddress: true
			}
		});

		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON)).toBeInTheDocument();
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
				onQRCodeScan,
				onClose,
				isNewAddress: true
			}
		});

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
				onQRCodeScan,
				onClose,
				isNewAddress: true
			}
		});

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
				onQRCodeScan,
				onClose,
				isNewAddress: true,
				address
			}
		});

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, {
			target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
		});

		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).not.toBeDisabled();
	});

	it('should call onAddAddress when save is clicked with isNewAddress=true', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();
		const address: Partial<ContactAddressUi> = {};

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onQRCodeScan,
				onClose,
				isNewAddress: true,
				address
			}
		});

		await fireEvent.input(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT), {
			target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
		});

		await fireEvent.input(getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT), {
			target: { value: 'Test Address' }
		});

		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		expect(onAddAddress).toHaveBeenCalledWith(
			expect.objectContaining({
				address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
				addressType: 'Eth',
				label: 'Test Address'
			})
		);
	});

	it('should call onSaveAddress when save is clicked with isNewAddress=false', async () => {
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
				onQRCodeScan,
				onClose,
				isNewAddress: false,
				address
			}
		});

		await fireEvent.click(getByTestId(ADDRESS_BOOK_SAVE_BUTTON));

		expect(onSaveAddress).toHaveBeenCalledWith(address);
	});

	it('should call onClose when cancel is clicked', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onQRCodeScan,
				onClose,
				isNewAddress: true
			}
		});

		await fireEvent.click(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON));

		expect(onClose).toHaveBeenCalled();
	});

	it('should show reset buttons for inputs when filled and not disabled', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onQRCodeScan,
				onClose,
				isNewAddress: true
			}
		});

		await fireEvent.input(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT), {
			target: { value: '0x1234567890abcdef' }
		});
		await fireEvent.input(getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT), {
			target: { value: 'My Wallet' }
		});

		const resetButtons = screen.getAllByRole('button', {
			name: 'Reset input value'
		});

		expect(resetButtons).toHaveLength(2);
	});

	it('should submit form on Enter key', async () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const { getByTestId, container } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onQRCodeScan,
				onClose,
				isNewAddress: true
			}
		});

		await fireEvent.input(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT), {
			target: { value: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' }
		});

		const form = container.querySelector('form');
		if (!form) {
			throw new Error('Form element not found');
		}
		await fireEvent.submit(form);

		expect(onAddAddress).toHaveBeenCalled();
	});

	it('should disable save button when alias is unchanged in edit mode', () => {
		const onSaveAddress = vi.fn();
		const onAddAddress = vi.fn();
		const onClose = vi.fn();

		const initialAddress: Partial<ContactAddressUi> = {
			address: 'icp:abcdefghijklmnopqrstuvwxyz',
			label: 'Original Label'
		};

		const { getByTestId } = render(EditAddressStep, {
			props: {
				contact: mockContact,
				onSaveAddress,
				onAddAddress,
				onQRCodeScan,
				onClose,
				isNewAddress: false,
				address: initialAddress
			}
		});

		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeDisabled();
	});
});
