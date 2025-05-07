import { getPool } from '$lib/api/icp-swap-factory.api';
import { factoryCreateMock, getPoolMock, mockPoolData } from '$tests/mocks/icp-swap.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@dfinity/principal';

vi.mock('$lib/constants/app.constants', () => ({
	ICP_SWAP_CANISTER_ID: '4mmnk-kiaaa-aaaag-qbllq-cai'
}));

vi.mock('$lib/canisters/icp-swap-factory.canister', async () => {
	const mocks = await import('$tests/mocks/icp-swap.mock');
	return {
		ICPSwapFactoryCanister: {
			create: mocks.factoryCreateMock
		}
	};
});

describe('icp-swap-factory.api', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getPool', () => {
		const params = {
			identity: mockIdentity,
			token0: { address: 'token0', standard: 'standard0' },
			token1: { address: 'token1', standard: 'standard1' },
			fee: 1000n,
			canisterId: 'aaaaa-aa'
		};

		it('should call factory to get pool and return data', async () => {
			const result = await getPool(params);

			expect(factoryCreateMock).toHaveBeenCalledWith({
				identity: mockIdentity,
				canisterId: Principal.fromText('aaaaa-aa')
			});

			expect(getPoolMock).toHaveBeenCalledWith({
				token0: params.token0,
				token1: params.token1,
				fee: params.fee
			});

			expect(result).toEqual(mockPoolData);
		});
	});
});
