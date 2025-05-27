import ContactForm from '$lib/components/address-book/ContactForm.svelte';
import { ADDRESS_BOOK_CONTACT_NAME_INPUT } from '$lib/constants/test-ids.constants';
import type { ContactUi } from '$lib/types/contact';
import en from '$tests/mocks/i18n.mock';
import { fireEvent, render } from '@testing-library/svelte';

describe('ContactForm', () => {
	it('should render the contact form with name field', () => {
		const { getByTestId, getByText } = render(ContactForm, { props: { contact: {} } });

		// Check that the name field is rendered
		expect(getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT)).toBeInTheDocument();
		expect(getByText(en.contact.fields.name)).toBeInTheDocument();
	});

	it('should validate successfully when name is provided', async () => {
		const contact: Partial<ContactUi> = {};
		const { component, getByTestId } = render(ContactForm, { props: { contact } });

		// Enter a name
		const nameInput = getByTestId(ADDRESS_BOOK_CONTACT_NAME_INPUT);
		await fireEvent.input(nameInput, { target: { value: 'Test Contact' } });

		// Check that validation passed
		expect(component.isValid).toBeTruthy();
	});

	it('should fail validation when name is empty', () => {
		const contact: Partial<ContactUi> = {};
		const { component } = render(ContactForm, { props: { contact } });

		// Check that validation failed
		expect(component.isValid).toBeFalsy();
	});

	it('should fail validation when name is only spaces', () => {
		const contact: Partial<ContactUi> = { name: '   ' };
		const { component } = render(ContactForm, { props: { contact } });

		// Check that validation failed
		expect(component.isValid).toBeFalsy();
	});
});
