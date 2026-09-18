import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ethersProvider } from '$eth/providers/ethers.providers';
import type { EthereumNetwork, EthersProviderNetwork } from '$eth/types/network';
import { nonNullish } from '@dfinity/utils';
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

	describe('ethersProvider', () => {
		describe('when the network has an Infura name', () => {
			const networks: EthereumNetwork[] = [
				...SUPPORTED_ETHEREUM_NETWORKS,
				...SUPPORTED_EVM_NETWORKS
			];

			it.each(networks)('should reach $name through Infura', (network) => {
				ethersProvider(network);

				expect(mockInfuraProvider).toHaveBeenCalledExactlyOnceWith(
					network.providers.infura,
					'test-infura-key'
				);
				expect(mockJsonRpcProvider).not.toHaveBeenCalled();
			});

			it('should leave every supported network on Infura', () => {
				// Guards the refactor: the fallback exists for chains Infura does not host, and must not
				// silently capture a chain that has an Infura name.
				expect(networks.every(({ providers: { infura } }) => nonNullish(infura))).toBeTruthy();
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
