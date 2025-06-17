import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import SendContacts from '$lib/components/send/SendContacts.svelte';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { ContactUi } from '$lib/types/contact';
import type { Token } from '$lib/types/token';
import { getNetworkContactKey } from '$lib/utils/contact.utils';
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import {
	getMockContactsUi,
	mockContactBtcAddressUi,
	mockContactEthAddressUi,
	mockContactIcrcAddressUi,
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

	const mockContext = (sendToken: Token) =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					token: sendToken
				})
			]
		]);

	const [principalOnlyContact] = getMockContactsUi({
		n: 1,
		name: 'Principal Only',
		addresses: [mockContactPrincipalAddressUi]
	}) as unknown as ContactUi[];

	const [contactWithPrincipalAndAccount] = getMockContactsUi({
		n: 1,
		name: 'Principal + Account',
		addresses: [mockContactPrincipalAddressUi, mockContactIcrcAddressUi]
	}) as unknown as ContactUi[];

	it('renders content if data is provided', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: '',
				networkContacts: {
					[getNetworkContactKey({
						contact: contact1,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactBtcAddressUi.address,
						contact: contact1
					}
				}
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
		).toBeInTheDocument();
	});

	it('renders filtered by address content if data is provided', () => {
		const { getByText } = render(SendContacts, {
			props: {
				destination: mockContactEthAddressUi.address,
				networkContacts: {
					[getNetworkContactKey({
						contact: contact1,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactBtcAddressUi.address,
						contact: contact1
					},
					[getNetworkContactKey({
						contact: contact2,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactEthAddressUi.address,
						contact: contact2
					}
				}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(() =>
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
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
					[getNetworkContactKey({
						contact: contact1,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactBtcAddressUi.address,
						contact: contact1
					},
					[getNetworkContactKey({
						contact: contact2,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactEthAddressUi.address,
						contact: contact2
					}
				}
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		expect(() =>
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
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
					[getNetworkContactKey({
						contact: contact1,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactBtcAddressUi.address,
						contact: contact1
					},
					[getNetworkContactKey({
						contact: contactWithLabel,
						address: mockContactBtcAddressUi.address
					})]: {
						address: mockContactEthAddressUi.address,
						contact: contactWithLabel
					}
				}
			},
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(() =>
			getByText(shortenWithMiddleEllipsis({ text: mockContactBtcAddressUi.address }))
		).toThrow();
		expect(
			getByText(shortenWithMiddleEllipsis({ text: mockContactEthAddressUi.address }))
		).toBeInTheDocument();
	});

	it('renders principal-only contact correctly', () => {
		const { getByRole, getByText } = render(SendContacts, {
			props: {
				destination: '',
				networkContacts: {
					[mockPrincipalText]: principalOnlyContact
				}
			},
			context: mockContext(ICP_TOKEN)
		});

		expect(getByRole('img', { name: /avatar for principal only/i })).toBeInTheDocument();

		expect(getByText((content) => content.includes('Principal Only'))).toBeInTheDocument();

		expect(getByText((content) => content.includes('xlmdg'))).toBeInTheDocument();
	});

	it('shows only the principal address if contact has both principal and account', () => {
		const { getByText, queryByText, getByRole } = render(SendContacts, {
			props: {
				destination: '',
				networkContacts: {
					[mockPrincipalText]: contactWithPrincipalAndAccount
				}
			},
			context: mockContext(ICP_TOKEN)
		});

		expect(getByText((content) => content.includes('Principal + Account'))).toBeInTheDocument();

		expect(getByText((content) => content.includes('xlmdg'))).toBeInTheDocument();

		expect(getByRole('img', { name: /avatar for principal/i })).toBeInTheDocument();

		expect(
			queryByText(shortenWithMiddleEllipsis({ text: mockContactIcrcAddressUi.address }))
		).not.toBeInTheDocument();
	});

	it('renders empty state component if data is empty', () => {
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
