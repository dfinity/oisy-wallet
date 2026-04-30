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
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
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

	describe('getPools', () => {
		it('returns all pools successfully', async () => {
			const poolData2: PoolData = {
				...poolData,
				key: 'token2_token3_3000',
				token0: { address: 'ccccc-cc', standard: 'icrc1' },
				token1: { address: 'ddddd-dd', standard: 'icrc1' }
			};

			service.getPools.mockResolvedValue({ ok: [poolData, poolData2] });

			const { getPools } = await createFactory({ serviceOverride: service });

			const result = await getPools();

			expect(result).toEqual([poolData, poolData2]);
			expect(service.getPools).toHaveBeenCalledOnce();
		});

		it('returns empty array when no pools exist', async () => {
			service.getPools.mockResolvedValue({ ok: [] });

			const { getPools } = await createFactory({ serviceOverride: service });

			const result = await getPools();

			expect(result).toEqual([]);
		});

		it('throws CanisterInternalError if result is error variant', async () => {
			service.getPools.mockResolvedValue({ err: { InternalError: 'Failed to fetch pools' } });

			const { getPools } = await createFactory({ serviceOverride: service });

			await expect(getPools()).rejects.toThrow(
				new CanisterInternalError('Internal error: Failed to fetch pools')
			);
		});

		it('throws raw error if getPools method fails', async () => {
			service.getPools.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getPools } = await createFactory({ serviceOverride: service });

			await expect(getPools()).rejects.toThrow(mockResponseError);
		});
	});
});
