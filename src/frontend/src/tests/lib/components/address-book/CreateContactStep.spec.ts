import CreateContactStep from '$lib/components/address-book/CreateContactStep.svelte';
import {
	ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT,
	ADDRESS_BOOK_ADDRESS_ALIAS_INPUT,
	ADDRESS_BOOK_CANCEL_BUTTON,
	ADDRESS_BOOK_CONTACT_NAME_INPUT,
	ADDRESS_BOOK_SAVE_BUTTON
} from '$lib/constants/test-ids.constants';
import en from '$tests/mocks/i18n.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('CreateContactStep', () => {
	it('should render the create contact step with forms and buttons', () => {
		const onSave = vi.fn();
		const onBack = vi.fn();

		const { getByTestId } = render(CreateContactStep, {
			props: { onSave, onBack, disabled: false }
		});

		// Check that the form is rendered
		expect(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT)).toBeInTheDocument();

		// Check that the buttons are rendered
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeInTheDocument();
		expect(getByTestId(ADDRESS_BOOK_CANCEL_BUTTON)).toBeInTheDocument();

		// Check that the save button has the correct text
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toHaveTextContent(en.core.text.create);
	});

	it('should disable save button when form is invalid', () => {
		const onSave = vi.fn();
		const onBack = vi.fn();

		const { getByTestId } = render(CreateContactStep, {
			props: { onSave, onBack, disabled: false }
		});

		// Check that the save button is disabled initially
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).toBeDisabled();
	});

	it('should enable save button when form is valid', async () => {
		const onSave = vi.fn();
		const onBack = vi.fn();

		const { getByTestId } = render(CreateContactStep, {
			props: { onSave, onBack, disabled: false }
		});

		// Enter a name to make the form valid
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);

		expect(addressInput).not.toBeDisabled();

		await fireEvent.input(addressInput, {
			target: { value: mockSolAddress }
		});

		const aliasInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		await fireEvent.input(aliasInput, { target: { value: 'Test alias' } });

		// Check that the save button is enabled
		expect(getByTestId(ADDRESS_BOOK_SAVE_BUTTON)).not.toBeDisabled();
	});

	it('should call onSave when save button is clicked', async () => {
		const onSave = vi.fn();
		const onBack = vi.fn();

		const { getByTestId } = render(CreateContactStep, {
			props: { onSave, onBack, disabled: false }
		});

		// Enter a name to make the form valid
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		const addressInput = getByTestId(ADDRESS_BOOK_ADDRESS_ADDRESS_INPUT);
		await fireEvent.input(addressInput, { target: { value: mockSolAddress } });

		const aliasInput = getByTestId(ADDRESS_BOOK_ADDRESS_ALIAS_INPUT);
		await fireEvent.input(aliasInput, { target: { value: 'Test alias' } });

		// Click the save button
		const saveButton = getByTestId(ADDRESS_BOOK_SAVE_BUTTON);
		await fireEvent.click(saveButton);

		// Check that onSave was called with the correct contact
		expect(onSave).toHaveBeenCalledOnce();
		expect(onSave).toHaveBeenCalledWith({
			name: 'Test Contact',
			addresses: [{ address: mockSolAddress, addressType: 'Sol', label: 'Test alias' }]
		});
	});

	it('should call onBack when back button is clicked', async () => {
		const onSave = vi.fn();
		const onBack = vi.fn();

		const { getByTestId } = render(CreateContactStep, {
			props: { onSave, onBack, disabled: false }
		});

		// Click the cancel button
		const cancelButton = getByTestId(ADDRESS_BOOK_CANCEL_BUTTON);
		await fireEvent.click(cancelButton);

		// Check that close was called
		expect(onBack).toHaveBeenCalledOnce();
	});
});
