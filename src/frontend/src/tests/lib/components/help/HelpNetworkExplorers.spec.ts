import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import HelpNetworkExplorers from '$lib/components/help/HelpNetworkExplorers.svelte';
import {
	HELP_NETWORK_EXPLORERS_CARD,
	HELP_NETWORK_EXPLORERS_LINK
} from '$lib/constants/test-ids.constants';
import { trackEvent } from '$lib/services/analytics.services';
import {
	btcAddressMainnetStore,
	ethAddressStore,
	solAddressMainnetStore
} from '$lib/stores/address.store';
import { replaceOisyPlaceholders } from '$lib/utils/i18n.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';
import { fireEvent, render } from '@testing-library/svelte';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const mainnets = [
	BTC_MAINNET_NETWORK,
	ETHEREUM_NETWORK,
	ICP_NETWORK,
	ARBITRUM_MAINNET_NETWORK,
	BASE_NETWORK,
	BSC_MAINNET_NETWORK,
	POLYGON_MAINNET_NETWORK,
	SOLANA_MAINNET_NETWORK
];

// Holders rather than fixed stores, so a single test can narrow the enabled networks or
// drop the ICP address without re-mocking the module.
const mockNetworks = vi.hoisted(() => ({ value: [] as unknown[] }));
const mockIcpAddress = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock('$lib/derived/networks.derived', async () => {
	const { derived, readable } = await import('svelte/store');

	return {
		networksMainnets: derived(readable(null), () => mockNetworks.value)
	};
});

vi.mock('$icp/derived/ic.derived', async () => {
	const { derived, readable } = await import('svelte/store');

	return {
		icrcAccountIdentifierText: derived(readable(null), () => mockIcpAddress.value)
	};
});

describe('HelpNetworkExplorers', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockNetworks.value = mainnets;
		mockIcpAddress.value = mockPrincipalText;

		ethAddressStore.set({ data: mockEthAddress, certified: false });
		solAddressMainnetStore.set({ data: mockSolAddress, certified: false });
		btcAddressMainnetStore.set({ data: mockBtcAddress, certified: false });
	});

	afterEach(() => {
		ethAddressStore.reset();
		solAddressMainnetStore.reset();
		btcAddressMainnetStore.reset();
	});

	it('renders the card with its title and description', () => {
		const { getByTestId, getByText } = render(HelpNetworkExplorers);

		expect(getByTestId(HELP_NETWORK_EXPLORERS_CARD)).toBeInTheDocument();
		expect(getByText(en.help.text.network_explorers_title)).toBeInTheDocument();
		expect(
			getByText(replaceOisyPlaceholders(en.help.text.network_explorers_description))
		).toBeInTheDocument();
	});

	it('opens each network explorer at the user own address', () => {
		const { getByTestId } = render(HelpNetworkExplorers);

		const href = (chain: string) =>
			getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-${chain}`).getAttribute('href');

		expect(href('icp')).toBe(`https://www.icexplorer.io/address/details/${mockPrincipalText}`);
		expect(href('btc')).toBe(`https://mempool.space/address/${mockBtcAddress}`);
		expect(href('eth')).toBe(`https://etherscan.io/address/${mockEthAddress}`);
		expect(href('arb')).toBe(`https://arbiscan.io/address/${mockEthAddress}`);
		expect(href('base')).toBe(`https://basescan.org/address/${mockEthAddress}`);
		expect(href('bsc')).toBe(`https://bscscan.com/address/${mockEthAddress}`);
		expect(href('pol')).toBe(`https://polygonscan.com/address/${mockEthAddress}`);
		expect(href('sol')).toBe(`https://solscan.io/account/${mockSolAddress}`);
	});

	it('labels each link with the network name and opens it in a new tab', () => {
		const { getByTestId, getByText } = render(HelpNetworkExplorers);

		expect(getByText(ICP_NETWORK.name)).toBeInTheDocument();
		expect(getByText(BTC_MAINNET_NETWORK.name)).toBeInTheDocument();

		const link = getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-eth`);

		expect(link.getAttribute('target')).toBe('_blank');
		expect(link.getAttribute('rel')).toBe('external noopener noreferrer');
		expect(link.getAttribute('aria-label')).toBe(
			`Open the ${ETHEREUM_NETWORK.name} block explorer for your address`
		);
	});

	it('follows the enabled networks rather than a fixed list', () => {
		mockNetworks.value = [ETHEREUM_NETWORK, ICP_NETWORK];

		const { getByTestId, queryByTestId } = render(HelpNetworkExplorers);

		expect(getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-eth`)).toBeInTheDocument();
		expect(getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-icp`)).toBeInTheDocument();
		expect(queryByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-base`)).toBeNull();
		expect(queryByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-sol`)).toBeNull();
	});

	it('omits a link whose address has not loaded', () => {
		solAddressMainnetStore.reset();

		const { getByTestId, queryByTestId } = render(HelpNetworkExplorers);

		expect(getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-eth`)).toBeInTheDocument();
		expect(queryByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-sol`)).toBeNull();
	});

	it('hides the whole card when no address has loaded', () => {
		ethAddressStore.reset();
		solAddressMainnetStore.reset();
		btcAddressMainnetStore.reset();
		mockIcpAddress.value = undefined;

		const { queryByTestId } = render(HelpNetworkExplorers);

		expect(queryByTestId(HELP_NETWORK_EXPLORERS_CARD)).toBeNull();
	});

	it('tracks the network, without a provider and without the URL', async () => {
		const { getByTestId } = render(HelpNetworkExplorers);

		await fireEvent.click(getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-pol`));

		expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
			name: 'help',
			metadata: {
				event_context: 'help',
				event_modifier: 'explorer',
				source_location: 'help_page',
				result_status: 'success',
				event_subcontext: 'network_explorers',
				event_key: 'network',
				event_value: 'pol'
			}
		});
	});

	it('never leaks an address into the tracked event', async () => {
		const { getByTestId } = render(HelpNetworkExplorers);

		await fireEvent.click(getByTestId(`${HELP_NETWORK_EXPLORERS_LINK}-icp`));

		const [[{ metadata }]] = vi.mocked(trackEvent).mock.calls;

		expect(JSON.stringify(metadata)).not.toContain(mockPrincipalText);
		expect(JSON.stringify(metadata)).not.toContain('icexplorer');
	});
});
