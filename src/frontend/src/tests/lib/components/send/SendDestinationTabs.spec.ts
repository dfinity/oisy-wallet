import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import SendDestinationTabs from '$lib/components/send/SendDestinationTabs.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
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

	const mockContext = (sendToken: Token) =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					token: sendToken
				})
			]
		]);

	it('renders known destinations tab', () => {
		const { getByText } = render(SendDestinationTabs, {
			props: {
				destination: '',
				knownDestinations,
				activeSendDestinationTab: 'recentlyUsed'
			},
			context: mockContext(BTC_MAINNET_TOKEN)
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
					[getNetworkContactKey({
						contact,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactBtcAddressUi.address,
						contact
					}
				},
				activeSendDestinationTab: 'contacts'
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
		).toBeInTheDocument();
		expect(container).toHaveTextContent(contact.name);
		expect(container).toHaveTextContent(mockContactBtcAddressUi.label as string);
	});
});
