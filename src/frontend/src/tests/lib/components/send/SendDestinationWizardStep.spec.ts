import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN } from '$env/tokens/tokens.sol.env';
import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
import {
	SEND_DESTINATION_WIZARD_CONTACT,
	SEND_DESTINATION_WIZARD_STEP,
	SEND_FORM_DESTINATION_NEXT_BUTTON
} from '$lib/constants/test-ids.constants';
import { contactsStore } from '$lib/stores/contacts.store';
import { i18n } from '$lib/stores/i18n.store';
import { SEND_CONTEXT_KEY, initSendContext, type SendContext } from '$lib/stores/send.store';
import type { ContactUi } from '$lib/types/contact';
import type { NetworkContacts } from '$lib/types/contacts';
import type { Token } from '$lib/types/token';
import { mapToFrontendContact } from '$lib/utils/contact.utils';
import { getNetworkContacts } from '$lib/utils/contacts.utils';
import SendDestinationWizardStepTestHost from '$tests/lib/components/send/SendDestinationWizardStepTestHost.svelte';
import { getMockContacts, mockBackendContactAddressEth } from '$tests/mocks/contacts.mock';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { fireEvent, render } from '@testing-library/svelte';
import { get, writable, type Writable } from 'svelte/store';

const mockContacts = getMockContacts({
	n: 3,
	names: ['Contact 1', 'Contact 2', 'Contact 3'],
	addresses: [
		[mockBackendContactAddressEth],
		[mockBackendContactAddressEth],
		[mockBackendContactAddressEth]
	]
});

contactsStore.addContact(mapToFrontendContact(mockContacts[0]));
contactsStore.addContact(mapToFrontendContact(mockContacts[1]));

describe('SendDestinationWizardStep', () => {
	const props = {
		destination: mockEthAddress
	};

	const mockContext = (sendToken: Token) =>
		new Map<symbol, SendContext>([
			[
				SEND_CONTEXT_KEY,
				initSendContext({
					token: sendToken
				})
			]
		]);

	// mock derived eth contacts as its used for the contact list in the send flow
	vi.mock('$eth/derived/eth-contacts.derived', () => ({
		ethNetworkContacts: {
			subscribe: (run: (value: NetworkContacts) => void) => {
				run(
					getNetworkContacts({
						addressType: 'Eth',
						contacts: mockContacts.map((c) => mapToFrontendContact(c))
					})
				);
				return () => {};
			}
		}
	}));

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should display BTC send destination components if sendToken network is BTC', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(BTC_MAINNET_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${BTC_MAINNET_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should display ETH send destination components if sendToken network is ETH', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(SEPOLIA_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${SEPOLIA_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should display IC send destination components if sendToken network is IC', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(mockValidIcCkToken)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${mockValidIcCkToken.network.name}`)
		).toBeInTheDocument();
	});

	it('should display SOL send destination components if sendToken network is SOL', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(SOLANA_DEVNET_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${SOLANA_DEVNET_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should display ETH send destination components if sendToken network is EVM', () => {
		const { getByTestId } = render(SendDestinationWizardStep, {
			props,
			context: mockContext(BASE_ETH_TOKEN)
		});

		expect(
			getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${BASE_ETH_TOKEN.network.name}`)
		).toBeInTheDocument();
	});

	it('should set selectedContact when a contact is selected', async () => {
		const selectedContact: Writable<ContactUi> = writable();
		const { getByText, getByTestId } = render(SendDestinationWizardStepTestHost, {
			props: { selectedContact },
			context: mockContext(ETHEREUM_TOKEN)
		});

		await fireEvent.click(getByText(get(i18n).send.text.contacts_tab));

		await fireEvent.click(
			getByTestId(`${SEND_DESTINATION_WIZARD_CONTACT}-${mockContacts[0].name}`)
		);

		expect(get(selectedContact)).toEqual(mapToFrontendContact(mockContacts[0]));
	});

	it('should set selectedContact when a contacts address is entered and next is clicked', async () => {
		const selectedContact: Writable<ContactUi> = writable();
		const { getByTestId } = render(SendDestinationWizardStepTestHost, {
			props: { destination: mockEthAddress3, selectedContact },
			context: mockContext(ETHEREUM_TOKEN)
		});

		await fireEvent.click(getByTestId(SEND_FORM_DESTINATION_NEXT_BUTTON));

		expect(get(selectedContact)).toEqual(mapToFrontendContact(mockContacts[0]));
	});

	it('should set selectedContact when selecting a contact without overwriting it with a lookup', async () => {
		const selectedContact: Writable<ContactUi> = writable();
		const { getByTestId, getByText } = render(SendDestinationWizardStepTestHost, {
			props: { destination: mockEthAddress3, selectedContact },
			context: mockContext(ETHEREUM_TOKEN)
		});

		await fireEvent.click(getByText(get(i18n).send.text.contacts_tab));

		// we deliberately select the last contact, which also has the same address as the first in store
		// since the lookup for the contact would return the first one, the contacts would not match in this test if we overwrote it with the lookup result
		await fireEvent.click(
			getByTestId(`${SEND_DESTINATION_WIZARD_CONTACT}-${mockContacts[2].name}`)
		);

		expect(get(selectedContact)).toEqual(mapToFrontendContact(mockContacts[2]));
	});
});
