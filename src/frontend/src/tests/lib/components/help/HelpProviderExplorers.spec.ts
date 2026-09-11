import {
	NEAR_INTENTS_EXPLORER_URL,
	ONESEC_EXPLORER_URL,
	VELORA_EXPLORER_URL
} from '$env/explorers.env';
import HelpProviderExplorers from '$lib/components/help/HelpProviderExplorers.svelte';
import {
	HELP_EXPLORERS_CARD,
	HELP_EXPLORERS_GROUP,
	HELP_EXPLORERS_LINK
} from '$lib/constants/test-ids.constants';
import { trackEvent } from '$lib/services/analytics.services';
import {
	btcAddressMainnetStore,
	ethAddressStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

describe('HelpProviderExplorers', () => {
	const setAddresses = () => {
		ethAddressStore.set({ data: mockEthAddress, certified: false });
		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });
	};

	beforeEach(() => {
		vi.clearAllMocks();

		ethAddressStore.reset();
		solAddressMainnetStore.reset();
		btcAddressMainnetStore.reset();

		mockAuthStore();
	});

	it('renders the card with its title and description', () => {
		setAddresses();

		const { getByTestId, getByText } = render(HelpProviderExplorers);

		expect(getByTestId(HELP_EXPLORERS_CARD)).toBeInTheDocument();
		expect(getByText(en.help.text.explorers_title)).toBeInTheDocument();
		expect(
			getByText(replaceOisyPlaceholders(en.help.text.explorers_description))
		).toBeInTheDocument();
	});

	it('introduces every provider it links to', () => {
		setAddresses();

		const { getAllByTestId, getByText } = render(HelpProviderExplorers);

		expect(getAllByTestId(HELP_EXPLORERS_GROUP)).toHaveLength(3);

		expect(getByText('Velora')).toBeInTheDocument();
		expect(getByText('NEAR Intents')).toBeInTheDocument();
		expect(getByText('1Sec')).toBeInTheDocument();

		expect(getByText(en.help.text.explorers_velora_description)).toBeInTheDocument();
		expect(getByText(en.help.text.explorers_near_intents_description)).toBeInTheDocument();
		expect(getByText(en.help.text.explorers_onesec_description)).toBeInTheDocument();
	});

	it('carries the user own address into every link', () => {
		setAddresses();

		const { getByTestId } = render(HelpProviderExplorers);

		expect(getByTestId(`${HELP_EXPLORERS_LINK}-velora-eth`).getAttribute('href')).toBe(
			`${VELORA_EXPLORER_URL}/explorer/user/${mockEthAddress}/all-orders`
		);
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-eth`).getAttribute('href')).toBe(
			`${NEAR_INTENTS_EXPLORER_URL}/?search=${mockEthAddress}`
		);
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-sol`).getAttribute('href')).toBe(
			`${NEAR_INTENTS_EXPLORER_URL}/?search=${mockSolAddress}`
		);
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-btc`).getAttribute('href')).toBe(
			`${NEAR_INTENTS_EXPLORER_URL}/?search=${mockBtcAddress}`
		);
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-oneSec-icp`).getAttribute('href')).toBe(
			`${ONESEC_EXPLORER_URL}/explorer/?address=${mockPrincipalText}`
		);
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-oneSec-eth`).getAttribute('href')).toBe(
			`${ONESEC_EXPLORER_URL}/explorer/?address=${mockEthAddress}`
		);
	});

	it('opens every link in a new tab', () => {
		setAddresses();

		const { getByTestId } = render(HelpProviderExplorers);

		expect(getByTestId(`${HELP_EXPLORERS_LINK}-velora-eth`).getAttribute('target')).toBe('_blank');
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-oneSec-icp`).getAttribute('rel')).toBe(
			'external noopener noreferrer'
		);
	});

	it('labels a link by the chain it is scoped to', () => {
		setAddresses();

		const { getByTestId } = render(HelpProviderExplorers);

		expect(getByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-btc`)).toHaveTextContent(
			en.help.text.explorers_chain_btc
		);
		expect(getByTestId(`${HELP_EXPLORERS_LINK}-oneSec-icp`).getAttribute('aria-label')).toBe(
			`Open the 1Sec explorer for your ${en.help.text.explorers_chain_icp} address`
		);
	});

	it('omits a link whose address has not loaded', () => {
		ethAddressStore.set({ data: mockEthAddress, certified: false });

		const { getByTestId, queryByTestId } = render(HelpProviderExplorers);

		expect(getByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-eth`)).toBeInTheDocument();
		expect(queryByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-sol`)).toBeNull();
		expect(queryByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-btc`)).toBeNull();
	});

	it('hides the whole card when no address has loaded', () => {
		mockAuthStore(null);

		const { queryByTestId } = render(HelpProviderExplorers);

		expect(queryByTestId(HELP_EXPLORERS_CARD)).toBeNull();
	});

	it('tracks the provider and the chain, never the URL', async () => {
		setAddresses();

		const { getByTestId } = render(HelpProviderExplorers);

		await fireEvent.click(getByTestId(`${HELP_EXPLORERS_LINK}-nearIntents-sol`));

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
			name: 'help',
			metadata: {
				event_context: 'help',
				event_modifier: 'explorer',
				source_location: 'help_page',
				result_status: 'success',
				event_subcontext: 'provider_explorers',
				event_provider: 'nearIntents',
				event_key: 'network',
				event_value: 'sol'
			}
		});
	});

	it('never leaks an address into the tracked event', async () => {
		setAddresses();

		const { getByTestId } = render(HelpProviderExplorers);

		await fireEvent.click(getByTestId(`${HELP_EXPLORERS_LINK}-oneSec-icp`));

		const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

		expect(JSON.stringify(metadata)).not.toContain(mockPrincipalText);
		expect(JSON.stringify(metadata)).not.toContain(ONESEC_EXPLORER_URL);
	});
});
