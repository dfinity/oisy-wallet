import { ETHERSCAN_NETWORK_HOMESTEAD } from '$env/networks.eth.env';
import { BOTTLENECK_PARAMS, etherscanSharedLimiter } from '$eth/constants/etherscan.constants';
import { EtherscanProvider } from '$eth/providers/etherscan.providers';
import { mockEthAddress } from '$tests/mocks/eth.mocks';
import { EtherscanProvider as EtherscanProviderLib } from '@ethersproject/providers';
import type { MockedClass } from 'vitest';

vi.mock('@ethersproject/providers', () => {
	const provider = vi.fn();
	provider.prototype.getHistory = vi.fn().mockResolvedValue([]);
	return { EtherscanProvider: provider };
});

vi.mock('$eth/constants/etherscan.constants', async () => {
	const original = await vi.importActual('$eth/constants/etherscan.constants');
	return {
		...original,
		ETHERSCAN_API_KEY: 'test-api-key'
	};
});

describe('etherscan.provider', () => {
	describe('EtherscanProvider', () => {
		const network = ETHERSCAN_NETWORK_HOMESTEAD;
		const address = mockEthAddress;
		const ETHERSCAN_API_KEY = 'test-api-key';

		const mockGetHistory = vi.fn().mockResolvedValue([]);
		const mockProvider = EtherscanProviderLib as MockedClass<typeof EtherscanProviderLib>;
		mockProvider.prototype.getHistory = mockGetHistory;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should initialise the provider with the correct network and API key', () => {
			const provider = new EtherscanProvider(network);

			expect(provider).toBeDefined();
			expect(EtherscanProviderLib).toHaveBeenCalledWith(network, ETHERSCAN_API_KEY);
		});

		it('should wrap the transactions method with the limiter', () => {
			const wrapSpy = vi.spyOn(etherscanSharedLimiter, 'wrap');

			const provider = new EtherscanProvider(network);

			expect(provider).toBeDefined();
			expect(wrapSpy).toHaveBeenCalledWith(expect.any(Function));
		});

		it('should call getHistory with correct parameters', async () => {
			mockGetHistory.mockResolvedValueOnce([]);

			const provider = new EtherscanProvider(network);

			const result = await provider.transactions({ address });

			expect(provider).toBeDefined();
			expect(mockGetHistory).toHaveBeenCalledWith(address, undefined);
			expect(result).toStrictEqual([]);
		});

		it('should limit the number of calls per second', async () => {
			const nCalls = 100;

			mockGetHistory.mockImplementation(() => Promise.resolve(Date.now()));

			const provider = new EtherscanProvider(network);

			const calls = Array.from({ length: nCalls }, () => provider.transactions({ address }));

			const allCalls = Promise.all(calls);

			const timestamps = await allCalls;

			expect(mockGetHistory).toHaveBeenCalledTimes(nCalls);

			const windows = timestamps.reduce<Record<number, number>>((acc, timestamp) => {
				const ts = timestamp as unknown as number;
				const windowStart = Math.floor(ts / 1000);
				return { ...acc, [windowStart]: (acc[windowStart] || 0) + 1 };
			}, {});

			Object.values(windows).forEach((callCount) => {
				expect(callCount).toBeLessThanOrEqual(BOTTLENECK_PARAMS.maxConcurrent);
			});
		}, 60000);
	});
});
