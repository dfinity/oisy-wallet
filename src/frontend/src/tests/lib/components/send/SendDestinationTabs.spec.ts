import SendDestinationTabs from '$lib/components/send/SendDestinationTabs.svelte';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import { knownDestinations } from '$tests/mocks/transactions.mock';
import { render } from '@testing-library/svelte';

describe('SendDestinationTabs', () => {
	const [contact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];

	it('renders known destinations tab', () => {
		const { getByText } = render(SendDestinationTabs, {
			props: {
				destination: '',
				knownDestinations,
				activeSendDestinationTab: 'recentlyUsed'
			}
		});

		Object.keys(knownDestinations).forEach((address) => {
			expect(getByText(shortenWithMiddleEllipsis({ text: address }))).toBeInTheDocument();
		});
	});

	it('renders contacts tab', () => {
		const { getByText, container } = render(SendDestinationTabs, {
			props: {
				destination: '',
				knownDestinations,
				networkContacts: {
					[mockContactBtcAddressUi.address]: contact
				},
				activeSendDestinationTab: 'contacts'
			}
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
		).toBeInTheDocument();
		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(mockContactBtcAddressUi.label as string);
	});
});
