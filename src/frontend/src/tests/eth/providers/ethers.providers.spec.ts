import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ethersProvider } from '$eth/providers/ethers.providers';
import type { EthereumNetwork, EthersProviderNetwork } from '$eth/types/network';
import { isNullish, nonNullish } from '@dfinity/utils';
import { InfuraProvider, JsonRpcProvider, Network } from 'ethers/providers';

// The shared vitest mock gives `InfuraProvider` and `JsonRpcProvider` the same implementation, so
// it cannot tell the two transports apart — which is the only thing this suite is about.
vi.mock('ethers/providers', () => ({
	InfuraProvider: vi.fn(),
	JsonRpcProvider: vi.fn(),
	Network: vi.fn()
}));

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-infura-key'
}));

vi.mock('$env/rest/alchemy.env', () => ({
	ALCHEMY_API_KEY: 'test-alchemy-key'
}));

describe('ethers.providers', () => {
	const mockInfuraProvider = vi.mocked(InfuraProvider);
	const mockJsonRpcProvider = vi.mocked(JsonRpcProvider);
	const mockNetwork = vi.mocked(Network);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	const supportedNetworks: EthereumNetwork[] = [
		...SUPPORTED_ETHEREUM_NETWORKS,
		...SUPPORTED_EVM_NETWORKS
	];

	const infuraNetworks = supportedNetworks.filter(({ providers: { infura } }) =>
		nonNullish(infura)
	);

	const fallbackNetworks = supportedNetworks.filter(({ providers: { infura } }) =>
		isNullish(infura)
	);

	describe('ethersProvider', () => {
		describe('when the network has an Infura name', () => {
			it.each(infuraNetworks)('should reach $name through Infura', (network) => {
				ethersProvider(network);

				expect(mockInfuraProvider).toHaveBeenCalledExactlyOnceWith(
					network.providers.infura,
					'test-infura-key'
				);
				expect(mockJsonRpcProvider).not.toHaveBeenCalled();
			});

			it('should leave every chain Infura hosts on Infura', () => {
				// Guards the refactor: the fallback exists for chains Infura does not host, and must not
				// silently capture anything else. Pinned by name rather than by count, so adding a
				// chain to the fallback is a deliberate edit here.
				expect(fallbackNetworks.map(({ name }) => name)).toEqual(['Robinhood Chain']);
			});
		});

		describe('when a supported network has no Infura name', () => {
			it.each(fallbackNetworks)('should read $name over its Alchemy URL', (network) => {
				ethersProvider(network);

				expect(mockInfuraProvider).not.toHaveBeenCalled();
				expect(mockJsonRpcProvider).toHaveBeenCalledExactlyOnceWith(
					`${network.providers.alchemyJsonRpcUrl}/test-alchemy-key`,
					expect.anything(),
					{ staticNetwork: true }
				);
				expect(mockNetwork).toHaveBeenCalledExactlyOnceWith(network.name, network.chainId);
			});
		});

		describe('when the network has no Infura name', () => {
			const network: EthersProviderNetwork = {
				name: 'Mock Network',
				chainId: 4_663n,
				providers: { alchemyJsonRpcUrl: 'https://mock-mainnet.g.alchemy.com/v2' }
			};

			it('should read over the Alchemy JSON-RPC URL instead', () => {
				ethersProvider(network);

				expect(mockInfuraProvider).not.toHaveBeenCalled();
				expect(mockJsonRpcProvider).toHaveBeenCalledExactlyOnceWith(
					'https://mock-mainnet.g.alchemy.com/v2/test-alchemy-key',
					expect.anything(),
					{ staticNetwork: true }
				);
			});

			it('should describe the chain to ethers, which does not know it', () => {
				ethersProvider(network);

				expect(mockNetwork).toHaveBeenCalledExactlyOnceWith('Mock Network', 4_663n);
			});
		});
	});
});
