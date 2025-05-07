import type { IcToken } from '$icp/types/ic-token';
import * as factoryApi from '$lib/api/icp-swap-factory.api';
import * as poolApi from '$lib/api/icp-swap-pool.api';
import { icpSwapAmounts } from '$lib/services/icp-swap.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

const mockPool = {
	canisterId: Principal.fromText('aaaaa-aa'),
	token0: { address: 'token0', standard: 'icrc' },
	token1: { address: 'token1', standard: 'icrc' },
	fee: 3000n,
	key: 'key',
	tickSpacing: 60n
};

describe('icpSwapAmounts', () => {
	const params = {
		identity: mockIdentity,
		sourceToken: { ledgerCanisterId: 'token0', standard: 'icrc' } as IcToken,
		destinationToken: { ledgerCanisterId: 'token1', standard: 'icrc' } as IcToken,
		sourceAmount: 1000n
	};

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns receiveAmount when everything succeeds', async () => {
		vi.spyOn(factoryApi, 'getPool').mockResolvedValue(mockPool);
		vi.spyOn(poolApi, 'getQuote').mockResolvedValue(999n);

		const result = await icpSwapAmounts(params);

		expect(result.receiveAmount).toBe(999n);
	});

	it('uses correct zeroForOne = true when source is token0', async () => {
		const getQuoteSpy = vi.spyOn(poolApi, 'getQuote').mockResolvedValue(888n);
		vi.spyOn(factoryApi, 'getPool').mockResolvedValue(mockPool);

		await icpSwapAmounts(params);

		expect(getQuoteSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			amountIn: '1000',
			zeroForOne: true,
			amountOutMinimum: '0'
		});
	});

	it('uses correct zeroForOne = false when source is token1', async () => {
		const flippedPool = {
			...mockPool,
			token0: { address: 'token1', standard: 'icrc' },
			token1: { address: 'token0', standard: 'icrc' }
		};

		const getQuoteSpy = vi.spyOn(poolApi, 'getQuote').mockResolvedValue(888n);
		vi.spyOn(factoryApi, 'getPool').mockResolvedValue(flippedPool);

		await icpSwapAmounts(params);

		expect(getQuoteSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			canisterId: 'aaaaa-aa',
			amountIn: '1000',
			zeroForOne: false,
			amountOutMinimum: '0'
		});
	});
});
