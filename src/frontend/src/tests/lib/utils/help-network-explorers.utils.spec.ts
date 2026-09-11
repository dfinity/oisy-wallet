import { ARBITRUM_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { BTC_MAINNET_NETWORK, BTC_TESTNET_NETWORK } from '$env/networks/networks.btc.env';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { SOLANA_MAINNET_NETWORK } from '$env/networks/networks.sol.env';
import { buildHelpNetworkExplorerLinks } from '$lib/utils/help-explorers.utils';
import { mockBtcAddress } from '$tests/mocks/btc.mock';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import { mockPrincipalText } from '$tests/mocks/identity.mock';
import { mockSolAddress } from '$tests/mocks/sol.mock';

describe('buildHelpNetworkExplorerLinks', () => {
	const addresses = {
		ethAddress: mockEthAddress,
		solAddress: mockSolAddress,
		btcAddress: mockBtcAddress,
		principal: mockPrincipalText
	};

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

	const urlFor = (chain: string) => {
		const links = buildHelpNetworkExplorerLinks({ networks: mainnets, ...addresses });

		return links.find((link) => link.chain === chain)?.url;
	};

	it('builds one link per given network, in the order they were given', () => {
		const links = buildHelpNetworkExplorerLinks({ networks: mainnets, ...addresses });

		expect(links.map(({ chain }) => chain)).toEqual([
			'btc',
			'eth',
			'icp',
			'arb',
			'base',
			'bsc',
			'pol',
			'sol'
		]);
	});

	it('opens the dedicated address explorers for ICP and Bitcoin', () => {
		// The ICP dashboard keys its account page by account identifier, not by principal.
		expect(urlFor('icp')).toBe(`https://www.icexplorer.io/address/details/${mockPrincipalText}`);
		expect(urlFor('btc')).toBe(`https://mempool.space/address/${mockBtcAddress}`);
	});

	it('reads the same Ethereum address on every EVM network', () => {
		expect(urlFor('eth')).toBe(`https://etherscan.io/address/${mockEthAddress}`);
		expect(urlFor('arb')).toBe(`https://arbiscan.io/address/${mockEthAddress}`);
		expect(urlFor('base')).toBe(`https://basescan.org/address/${mockEthAddress}`);
		expect(urlFor('bsc')).toBe(`https://bscscan.com/address/${mockEthAddress}`);
		expect(urlFor('pol')).toBe(`https://polygonscan.com/address/${mockEthAddress}`);
	});

	it('substitutes the Solana account into its URL template', () => {
		expect(urlFor('sol')).toBe(`https://solscan.io/account/${mockSolAddress}`);
	});

	it('carries the network through, so the caller can label the link', () => {
		const [first] = buildHelpNetworkExplorerLinks({ networks: [ICP_NETWORK], ...addresses });

		expect(first.network).toBe(ICP_NETWORK);
	});

	it('omits a network whose address has not loaded', () => {
		const links = buildHelpNetworkExplorerLinks({
			networks: mainnets,
			...addresses,
			solAddress: undefined
		});

		expect(links.map(({ chain }) => chain)).not.toContain('sol');
		expect(links).toHaveLength(mainnets.length - 1);
	});

	it('drops every EVM link at once when the Ethereum address is missing', () => {
		const links = buildHelpNetworkExplorerLinks({
			networks: mainnets,
			...addresses,
			ethAddress: ''
		});

		expect(links.map(({ chain }) => chain)).toEqual(['btc', 'icp', 'sol']);
	});

	it('omits a network that has no address explorer', () => {
		const links = buildHelpNetworkExplorerLinks({
			networks: [SEPOLIA_NETWORK, BTC_TESTNET_NETWORK, ICP_NETWORK],
			...addresses
		});

		expect(links.map(({ chain }) => chain)).toEqual(['icp']);
	});

	it('returns nothing when no network is given', () => {
		expect(buildHelpNetworkExplorerLinks({ networks: [], ...addresses })).toEqual([]);
	});

	it('returns nothing when no address has loaded', () => {
		expect(buildHelpNetworkExplorerLinks({ networks: mainnets })).toEqual([]);
	});
});
