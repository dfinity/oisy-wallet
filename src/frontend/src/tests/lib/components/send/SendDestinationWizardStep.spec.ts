import { BASE_ETH_TOKEN } from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_DEVNET_TOKEN } from '$env/tokens/tokens.sol.env';
import { XRP_TOKEN, XRP_TOKEN_ID } from '$env/tokens/tokens.xrp.env';
import SendDestinationWizardStep from '$lib/components/send/SendDestinationWizardStep.svelte';
import {
	DESTINATION_INPUT,
	SEND_DESTINATION_WIZARD_CONTACT,
	SEND_DESTINATION_WIZARD_STEP,
	SEND_FIRST_TIME_DESTINATION_WARNING,
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
import { shortenWithMiddleEllipsis } from '$lib/utils/format.utils';
import SendDestinationWizardStepTestHost from '$tests/lib/components/send/SendDestinationWizardStepTestHost.svelte';
import { getMockContacts, mockBackendContactAddressEth } from '$tests/mocks/contacts.mock';
import { mockEthAddress, mockEthAddress3 } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';
import { mockXrpAddress, mockXrpAddress2 } from '$tests/mocks/xrp.mock';
import {
	xrpTransactionsStore,
	type XrpCertifiedTransaction
} from '$xrp/stores/xrp-transactions.store';
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

// XRP is force-disabled under TEST, so `isNetworkIdXrp` would never match and the XRP branch
// would be unreachable. Enable the catalog for this spec.
vi.mock('$env/networks/networks.xrp.env', async () => {
	const actual = await vi.importActual<Record<string, unknown>>('$env/networks/networks.xrp.env');

	return {
		...actual,
		XRP_MAINNET_ENABLED: true,
		SUPPORTED_XRP_NETWORKS: [actual.XRP_MAINNET_NETWORK],
		SUPPORTED_XRP_NETWORK_IDS: [actual.XRP_MAINNET_NETWORK_ID]
	};
});

describe('SendDestinationWizardStep', () => {
	const props = {
		destination: mockEthAddress,
		activeSendDestinationTab: 'recentlyUsed' as const,
		onBack: vi.fn(),
		onNext: vi.fn(),
		onClose: vi.fn(),
		onQRCodeScan: vi.fn()
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

	// XRP contacts need a backend address type, so Recently Used is the only tab: a Contacts tab
	// could only ever show its empty state.
	describe('XRP', () => {
		const createXrpSend = (to: string): XrpCertifiedTransaction => ({
			data: {
				id: `tx-${to}`,
				type: 'send',
				status: 'confirmed',
				value: 1_000_000n,
				from: mockXrpAddress,
				to,
				timestamp: 1_700_000_000n
			},
			certified: false
		});

		beforeEach(() => {
			xrpTransactionsStore.reset(XRP_TOKEN_ID);
		});

		it('should display the XRP send destination components', () => {
			const { getByTestId } = render(SendDestinationWizardStep, {
				props,
				context: mockContext(XRP_TOKEN)
			});

			expect(
				getByTestId(`${SEND_DESTINATION_WIZARD_STEP}-${XRP_TOKEN.network.name}`)
			).toBeInTheDocument();
		});

		it('should show the Recently Used tab without a Contacts tab', () => {
			const { getByText, queryByText } = render(SendDestinationWizardStep, {
				props,
				context: mockContext(XRP_TOKEN)
			});

			expect(getByText(en.send.text.recently_used_tab)).toBeInTheDocument();
			expect(queryByText(en.send.text.contacts_tab)).toBeNull();
		});

		// The modal keeps one tab state for every network, so it still says `contacts` when the user
		// opened that tab on another network before picking XRP.
		it('should list the recently used addresses when the modal last had the Contacts tab open', () => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN_ID,
				transactions: [createXrpSend(mockXrpAddress2)]
			});

			const { getByText } = render(SendDestinationWizardStep, {
				props: { ...props, destination: '', activeSendDestinationTab: 'contacts' as const },
				context: mockContext(XRP_TOKEN)
			});

			expect(getByText(shortenWithMiddleEllipsis({ text: mockXrpAddress2 }))).toBeInTheDocument();
		});

		// Navigation comes from the step's toolbar, not from the tabs.
		it('should still offer the next button', () => {
			const { getByTestId } = render(SendDestinationWizardStep, {
				props,
				context: mockContext(XRP_TOKEN)
			});

			expect(getByTestId(SEND_FORM_DESTINATION_NEXT_BUTTON)).toBeInTheDocument();
		});

		it('should show the recently used empty state when nothing was sent yet', () => {
			const { getByText } = render(SendDestinationWizardStep, {
				props: { ...props, destination: '' },
				context: mockContext(XRP_TOKEN)
			});

			expect(getByText(en.send.text.recently_used_empty_state_title)).toBeInTheDocument();
		});

		it('should fill in a recently used address and move on when it is selected', async () => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN_ID,
				transactions: [createXrpSend(mockXrpAddress2)]
			});

			const { getByText, getByTestId } = render(SendDestinationWizardStep, {
				props: { ...props, destination: '' },
				context: mockContext(XRP_TOKEN)
			});

			await fireEvent.click(getByText(shortenWithMiddleEllipsis({ text: mockXrpAddress2 })));

			expect(getByTestId(DESTINATION_INPUT)).toHaveValue(mockXrpAddress2);
			expect(props.onNext).toHaveBeenCalledOnce();
		});

		it('should warn about an address that was never sent to', () => {
			const { getByTestId } = render(SendDestinationWizardStep, {
				props: { ...props, destination: mockXrpAddress2 },
				context: mockContext(XRP_TOKEN)
			});

			expect(getByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeInTheDocument();
		});

		it('should not warn about a recently used address', () => {
			xrpTransactionsStore.append({
				tokenId: XRP_TOKEN_ID,
				transactions: [createXrpSend(mockXrpAddress2)]
			});

			const { queryByTestId } = render(SendDestinationWizardStep, {
				props: { ...props, destination: mockXrpAddress2 },
				context: mockContext(XRP_TOKEN)
			});

			expect(queryByTestId(SEND_FIRST_TIME_DESTINATION_WARNING)).toBeNull();
		});
	});

	it('should set selectedContact when a contact is selected', async () => {
		const selectedContact: Writable<ContactUi> = writable();
		const { getByText, getByTestId } = render(SendDestinationWizardStepTestHost, {
			props: {
				selectedContact,
				destination: '',
				activeSendDestinationTab: 'recentlyUsed',
				onBack: vi.fn(),
				onNext: vi.fn(),
				onClose: vi.fn(),
				onQRCodeScan: vi.fn()
			},
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
			props: {
				destination: mockEthAddress3,
				selectedContact,
				activeSendDestinationTab: 'recentlyUsed',
				onBack: vi.fn(),
				onNext: vi.fn(),
				onClose: vi.fn(),
				onQRCodeScan: vi.fn()
			},
			context: mockContext(ETHEREUM_TOKEN)
		});

		await fireEvent.click(getByTestId(SEND_FORM_DESTINATION_NEXT_BUTTON));

		expect(get(selectedContact)).toEqual(mapToFrontendContact(mockContacts[0]));
	});

	it('should set selectedContact when selecting a contact without overwriting it with a lookup', async () => {
		const selectedContact: Writable<ContactUi> = writable();
		const { getByTestId, getByText } = render(SendDestinationWizardStepTestHost, {
			props: {
				destination: mockEthAddress3,
				selectedContact,
				activeSendDestinationTab: 'recentlyUsed',
				onBack: vi.fn(),
				onNext: vi.fn(),
				onClose: vi.fn(),
				onQRCodeScan: vi.fn()
			},
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
