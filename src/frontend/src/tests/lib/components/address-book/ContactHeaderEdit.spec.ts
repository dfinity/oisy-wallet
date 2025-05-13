import ContactHeaderEdit from '$lib/components/address-book/ContactHeaderEdit.svelte';
import { CONTACT_HEADER_EDITING_EDIT_BUTTON } from '$lib/constants/test-ids.constants';
import type { Contact } from '$lib/types/contact';
import { fireEvent, render } from '@testing-library/svelte';
import { vi } from 'vitest';

describe('ContactHeaderEdit', () => {
	const mockContact: Contact = {
		id: 'test-id',
		name: 'Test Contact',
		addresses: [
			{
				id: 'address-1',
				address: 'test-address-1'
			}
		]
	};

	it('should render the contact header with name', () => {
		const select = vi.fn();

		const { getByTestId, getByText } = render(ContactHeaderEdit, {
			props: { contact: mockContact, select }
		});

		// Check that the button is rendered
		expect(getByTestId(CONTACT_HEADER_EDITING_EDIT_BUTTON)).toBeInTheDocument();

		// Check that the contact name is displayed
		expect(getByText('Test Contact')).toBeInTheDocument();
	});

	it('should call select function when clicked', async () => {
		const select = vi.fn();

		const { getByTestId } = render(ContactHeaderEdit, {
			props: { contact: mockContact, select }
		});

		// Click the button
		const button = getByTestId(CONTACT_HEADER_EDITING_EDIT_BUTTON);
		await fireEvent.click(button);

		// Check that select was called with the contact
		expect(select).toHaveBeenCalledTimes(1);
		expect(select).toHaveBeenCalledWith(mockContact);
	});
});
