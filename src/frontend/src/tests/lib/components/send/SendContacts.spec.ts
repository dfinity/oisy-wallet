import SendContacts from '$lib/components/send/SendContacts.svelte';
import type { ContactUi } from '$lib/types/contact';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { getMockContactsUi, mockContactBtcAddressUi } from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { render } from '@testing-library/svelte';

describe('SendContacts', () => {
	const [contact] = getMockContactsUi({
		n: 1,
		name: 'Multiple Addresses Contact',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];

	it('renders content if data is provided', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: '',
				networkContacts: {
					[mockContactBtcAddressUi.address]: contact
				}
			}
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
		).toBeInTheDocument();
	});

	it('renders empty state component if data is empty', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: mockBtcAddress
			}
		});

		expect(getByText(en.send.text.contacts_empty_state_title)).toBeInTheDocument();
		expect(getByText(en.send.text.contacts_empty_state_description)).toBeInTheDocument();
	});
});
