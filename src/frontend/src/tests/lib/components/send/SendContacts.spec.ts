import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SendContacts from '$lib/components/send/SendContacts.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactEthAddressUi,
	mockContactPrincipalAddressUi
} from '$tests/mocks/contacts.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { render } from '@testing-library/svelte';

describe('SendContacts', () => {
	const [contact1] = getMockContactsUi({
		n: 1,
		name: 'Test 1',
		addresses: [mockContactBtcAddressUi]
	}) as unknown as ContactUi[];
	const [contact2] = getMockContactsUi({
		n: 1,
		name: 'Test 2',
		addresses: [mockContactEthAddressUi]
	}) as unknown as ContactUi[];

	const [principalContact] = getMockContactsUi({
		n: 1,
		name: 'Principal User',
		addresses: [mockContactPrincipalAddressUi]
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

	it('renders content if data is provided', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: '',
				networkContacts: {
					[mockContactBtcAddressUi.address]: contact1
				}
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(getByText('Test 1')).toBeInTheDocument();
		expect(getByText(/bc1qt0n\.\.\.-Test 1/)).toBeInTheDocument();
	});

	it('renders filtered by address content if data is provided', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: mockContactEthAddressUi.address,
				networkContacts: {
					[mockContactBtcAddressUi.address]: contact1,
					[mockContactEthAddressUi.address]: contact2
				}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(() =>
			getByText(`${shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address })}-Test 1`)
		).toThrow();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactEthAddressUi.address }))
		).toBeInTheDocument();
	});

	it('renders filtered by contact name content if data is provided', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: contact2.name.toUpperCase(),
				networkContacts: {
					[mockContactBtcAddressUi.address]: contact1,
					[mockContactEthAddressUi.address]: contact2
				}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(() =>
			getByText(`${shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address })}-Test 1`)
		).toThrow();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactEthAddressUi.address }))
		).toBeInTheDocument();
	});

	it('renders filtered by contact address label content if data is provided', () => {
		const contactWithLabel = {
			...contact2,
			addresses: [
				{
					...contact2.addresses[0],
					label: 'LABEL'
				}
			]
		};

		const { getByText } = render(SendContacts, {
			props: {
				destination: contactWithLabel.addresses[0].label,
				networkContacts: {
					[mockContactBtcAddressUi.address]: contact1,
					[mockContactEthAddressUi.address]: contactWithLabel
				}
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(() =>
			getByText(`${shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address })}-Test 1`)
		).toThrow();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactEthAddressUi.address }))
		).toBeInTheDocument();
	});

	it('renders principal contact by address', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: mockPrincipalText,
				networkContacts: {
					[mockPrincipalText]: principalContact
				}
			},
			context: mockContext(ICP_TOKEN)
		});

		expect(getByText('xlmdg')).toBeInTheDocument();
		expect(getByText('Principal User')).toBeInTheDocument();
	});

	it('renders principal contact by name', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: principalContact.name.toLowerCase(),
				networkContacts: {
					[mockPrincipalText]: principalContact
				}
			},
			context: mockContext(ICP_TOKEN)
		});

		expect(getByText('xlmdg')).toBeInTheDocument();
		expect(getByText('Principal User')).toBeInTheDocument();
	});

	it('renders empty state if no contacts match', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: mockBtcAddress
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(getByText(en.send.text.contacts_empty_state_title)).toBeInTheDocument();
		expect(getByText(en.send.text.contacts_empty_state_description)).toBeInTheDocument();
	});
});
