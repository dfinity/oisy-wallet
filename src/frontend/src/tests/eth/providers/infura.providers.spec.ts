import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { ETHEREUM_NETWORK, SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';
import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { InfuraProvider, infuraProviders } from '$eth/providers/infura.providers';
import type { EthereumNetwork } from '$eth/types/network';
import {
	OP_STACK_GAS_PRICE_ORACLE_ABI,
	OP_STACK_GAS_PRICE_ORACLE_ADDRESS
} from '$evm/base/constants/base.constants';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { mockEthAddress } from '$tests/mocks/eth.mock';
import en from '$tests/mocks/i18n.mock';
import { Contract } from 'ethers/contract';
import { InfuraProvider as InfuraProviderLib } from 'ethers/providers';

vi.mock('$env/rest/infura.env', () => ({
	INFURA_API_KEY: 'test-api-key'
}));

vi.mock('ethers/contract', () => ({
	Contract: vi.fn()
}));

describe('infura.providers', () => {
	const INFURA_API_KEY = 'test-api-key';

	const networks: EthereumNetwork[] = [...SUPPORTED_ETHEREUM_NETWORKS, ...SUPPORTED_EVM_NETWORKS];

	it('should create the correct map of providers', () => {
		expect(InfuraProviderLib).toHaveBeenCalledTimes(networks.length);

		networks.forEach(({ providers: { infura } }, index) => {
			expect(InfuraProviderLib).toHaveBeenNthCalledWith(index + 1, infura, INFURA_API_KEY);
		});
	});

	describe('InfuraProvider', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;

		const mockProvider = vi.mocked(InfuraProviderLib);
		const mockGetTransactionCount = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			mockProvider.prototype.getTransactionCount = mockGetTransactionCount;
		});

		describe('getTransactionCountLatest', () => {
			const mockCount = 7;

			beforeEach(() => {
				mockGetTransactionCount.mockResolvedValue(mockCount);
			});

			it('should call getTransactionCount with the latest tag', async () => {
				const provider = new InfuraProvider(infura);

				await expect(provider.getTransactionCountLatest(mockEthAddress)).resolves.toBe(mockCount);

				expect(mockGetTransactionCount).toHaveBeenCalledExactlyOnceWith(mockEthAddress, 'latest');
			});

			it('should propagate errors from the underlying provider', async () => {
				const mockError = new Error('Mock error');
				mockGetTransactionCount.mockRejectedValueOnce(mockError);

				const provider = new InfuraProvider(infura);

				await expect(provider.getTransactionCountLatest(mockEthAddress)).rejects.toThrow(mockError);
			});
		});

		describe('getTransactionCountPending', () => {
			const mockCount = 11;

			beforeEach(() => {
				mockGetTransactionCount.mockResolvedValue(mockCount);
			});

			it('should call getTransactionCount with the pending tag', async () => {
				const provider = new InfuraProvider(infura);

				await expect(provider.getTransactionCountPending(mockEthAddress)).resolves.toBe(mockCount);

				expect(mockGetTransactionCount).toHaveBeenCalledExactlyOnceWith(mockEthAddress, 'pending');
			});

			it('should propagate errors from the underlying provider', async () => {
				const mockError = new Error('Mock error');
				mockGetTransactionCount.mockRejectedValueOnce(mockError);

				const provider = new InfuraProvider(infura);

				await expect(provider.getTransactionCountPending(mockEthAddress)).rejects.toThrow(
					mockError
				);
			});
		});
	});

	describe('getL1FeeUpperBound', () => {
		const {
			providers: { infura }
		} = ETHEREUM_NETWORK;

		const mockGetL1FeeUpperBound = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(Contract).prototype.getL1FeeUpperBound =
				mockGetL1FeeUpperBound as unknown as typeof Contract.prototype.getL1FeeUpperBound;
		});

		it('should quote the GasPriceOracle predeploy for the given transaction size', async () => {
			mockGetL1FeeUpperBound.mockResolvedValue(875_004_002n);

			const provider = new InfuraProvider(infura);

			await expect(provider.getL1FeeUpperBound(128n)).resolves.toBe(875_004_002n);

			expect(Contract).toHaveBeenCalledExactlyOnceWith(
				OP_STACK_GAS_PRICE_ORACLE_ADDRESS,
				OP_STACK_GAS_PRICE_ORACLE_ABI,
				expect.anything()
			);
			expect(mockGetL1FeeUpperBound).toHaveBeenCalledExactlyOnceWith(128n);
		});
	});

	describe('infuraProviders', () => {
		networks.forEach(({ id, name }) => {
			it(`should return the correct provider for ${name} network`, () => {
				const provider = infuraProviders(id);

				expect(provider).toBeInstanceOf(InfuraProvider);

				expect(provider).toHaveProperty('network');
			});
		});

		it('should throw an error for an unsupported network ID', () => {
			expect(() => infuraProviders(ICP_NETWORK_ID)).toThrow(
				replacePlaceholders(en.init.error.no_infura_provider, {
					$network: ICP_NETWORK_ID.toString()
				})
			);
		});
	});
});
