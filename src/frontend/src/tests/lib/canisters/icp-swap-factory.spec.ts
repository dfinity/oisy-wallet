import type {
	GetPoolArgs,
	PoolData,
	Result_8,
	_SERVICE as SwapFactoryService
} from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

describe('icp_swap_factory.canister', () => {
	const createFactory = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<SwapFactoryService>, 'serviceOverride'>) =>
		ICPSwapFactoryCanister.create({
			canisterId: Principal.fromText('4mmnk-kiaaa-aaaag-qbllq-cai'),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<SwapFactoryService>>();
	const mockResponseError = new Error('Factory error');
	const args: GetPoolArgs = {
		token0: { address: 'aaaaa-aa', standard: 'icrc1' },
		token1: { address: 'bbbbb-bb', standard: 'icrc1' },
		fee: 3000n
	};

	const poolData: PoolData = {
		canisterId: Principal.fromText('aaaaa-aa'),
		fee: 3000n,
		key: 'token0_token1_3000',
		tickSpacing: 60n,
		token0: args.token0,
		token1: args.token1
	};

	const errorResponse: Result_8 = { err: { InternalError: 'Failed to find pool' } };

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getPool', () => {
		it('returns pool data successfully', async () => {
			const response = {
				ok: poolData
			};

			service.getPool.mockResolvedValue(response);

			const { getPool } = await createFactory({ serviceOverride: service });

			const result = await getPool({
				token0: { address: 'aaaaa-aa', standard: 'icrc1' },
				token1: { address: 'bbbbb-bb', standard: 'icrc1' },
				fee: 3000n
			});

			expect(result).toEqual(poolData);
			expect(service.getPool).toHaveBeenCalledWith(args);
		});

		it('throws CanisterInternalError if result is error variant', async () => {
			service.getPool.mockResolvedValue(errorResponse);

			const { getPool } = await createFactory({ serviceOverride: service });

			const result = getPool(args);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Failed to find pool')
			);
		});

		it('throws raw error if getPool method fails', async () => {
			service.getPool.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getPool } = await createFactory({ serviceOverride: service });

			const result = getPool(args);

			await expect(result).rejects.toThrow(mockResponseError);
		});

		it('throws error for unexpected structure', async () => {
			// @ts-expect-error for test purposes
			service.getPool.mockResolvedValue({ unexpected: true });

			const { getPool } = await createFactory({ serviceOverride: service });

			const result = getPool(args);

			await expect(result).rejects.toThrow();
		});
	});
});
