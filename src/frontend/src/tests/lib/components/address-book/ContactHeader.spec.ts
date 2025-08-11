import ContactHeader from '$lib/components/address-book/ContactHeader.svelte';
import { CONTACT_TEXT_COLORS } from '$lib/constants/contact.constants';
import { CONTACT_HEADER_EDIT_BUTTON } from '$lib/constants/test-ids.constants';
import { selectColorForName } from '$lib/utils/contact.utils';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { readable } from 'svelte/store';

describe('ContactHeader', () => {
	// Mock the i18n store
	const mockI18n = readable(en);

	// Setup the context with the mocked i18n store
	const mockContext = new Map([['i18n', mockI18n]]);

	it('should render the contact header with name', () => {
		const name = 'Test Contact';
		const onEdit = vi.fn();

		const { container } = render(ContactHeader, {
			props: { name, onEdit },
			context: mockContext
		});

		// Check that the name is displayed
		expect(container).toHaveTextContent(name);
	});

	it('should call edit function when edit button is clicked', async () => {
		const name = 'Test Contact';
		const onEdit = vi.fn();

		const { getByTestId } = render(ContactHeader, {
			props: { name, onEdit },
			context: mockContext
		});

		// Find the edit button using test ID
		const editButton = getByTestId(CONTACT_HEADER_EDIT_BUTTON);

		// Click the edit button
		await fireEvent.click(editButton);

		// Check that edit was called
		expect(onEdit).toHaveBeenCalled();
	});

	it('should display the edit button with correct text', () => {
		const name = 'Test Contact';
		const onEdit = vi.fn();

		const { getByTestId } = render(ContactHeader, {
			props: { name, onEdit },
			context: mockContext
		});

		// Find the edit button using test ID
		const editButton = getByTestId(CONTACT_HEADER_EDIT_BUTTON);

		// Check that the button has the correct text
		expect(editButton).toHaveTextContent(en.core.text.edit);
	});

	it('should apply the correct color based on the name', () => {
		const name = 'Test Contact';
		const onEdit = vi.fn();

		const { container } = render(ContactHeader, {
			props: { name, onEdit },
			context: mockContext
		});

		// Calculate the expected color
		const expectedColor = selectColorForName({ name, colors: CONTACT_TEXT_COLORS });

		// Check that the color class is applied
		const colorElement = container.querySelector(`.${expectedColor}`);

		expect(colorElement).not.toBeNull();
	});

	it('should apply custom style class', () => {
		const name = 'Test Contact';
		const onEdit = vi.fn();
		const styleClass = 'custom-class';

		const { container } = render(ContactHeader, {
			props: { name, onEdit, styleClass },
			context: mockContext
		});

		// Check that the custom class is applied
		const headerElement = container.querySelector(`.${styleClass}`);

		expect(headerElement).not.toBeNull();
	});
});
