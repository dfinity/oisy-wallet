import SendReviewDestination from '$lib/components/send/SendReviewDestination.svelte';
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
});
