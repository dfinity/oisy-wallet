import SendContact from '$lib/components/send/SendContact.svelte';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { render } from '@testing-library/svelte';

describe('SendContact', () => {
	const [contact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	const props = {
		contact,
		onClick: () => {},
		address: mockContactBtcAddressUi.address
	};

	it('renders expected data', () => {
		const { getByText, container } = render(SendContact, {
			props
		});

		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(mockContactBtcAddressUi.label as string);
		expect(getByText(shortenWithMiddleEllipsis({ text: props.address }))).toBeInTheDocument();
	});
});
