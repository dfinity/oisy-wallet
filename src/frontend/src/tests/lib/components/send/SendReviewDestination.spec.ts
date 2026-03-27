import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
import { contactsStore } from '$lib/stores/contacts.store';
import type { ContactUi } from '$lib/types/contact';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { render } from '@testing-library/svelte';

describe('SendReviewDestination', () => {
	const [contact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	const props = {
		selectedContact: contact,
		destination: mockContactBtcAddressUi.address
	};

	it('renders expected data', () => {
		const { getByText, container } = render(SendReviewDestination, {
			props
		});

		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(mockContactBtcAddressUi.label as string);
		expect(getByText(props.destination)).toBeInTheDocument();
	});

	it('renders the contact anyway if it is not passed', () => {
		contactsStore.reset();
		contactsStore.set([contact]);

		const { getByText, container } = render(SendReviewDestination, {
			props: { ...props, selectedContact: undefined }
		});

		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(mockContactBtcAddressUi.label as string);
		expect(getByText(props.destination)).toBeInTheDocument();

		contactsStore.reset();
	});
});
