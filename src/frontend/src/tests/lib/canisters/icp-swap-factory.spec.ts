import type {
	GetPoolArgs,
	PoolData,
	Result_8,
	_SERVICE as SwapFactoryService
} from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@icp-sdk/core/agent';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icp_swap_factory.canister', () => {
	const service = mock<ActorSubclass<SwapFactoryService>>();
	const certifiedService = mock<ActorSubclass<SwapFactoryService>>();

	const createFactory = () =>
		ICPSwapFactoryCanister.create({
			canisterId: Principal.fromText('4mmnk-kiaaa-aaaag-qbllq-cai'),
			identity: mockIdentity,
			serviceOverride: service,
			certifiedServiceOverride: certifiedService
		});

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
		it('returns pool data from a certified call by default', async () => {
			certifiedService.getPool.mockResolvedValue({ ok: poolData });

			const { getPool } = await createFactory();

			const result = await getPool(args);

			expect(result).toEqual(poolData);
			expect(certifiedService.getPool).toHaveBeenCalledExactlyOnceWith(args);
			expect(service.getPool).not.toHaveBeenCalled();
		});

		it('returns pool data from a certified call when certified is true', async () => {
			certifiedService.getPool.mockResolvedValue({ ok: poolData });

			const { getPool } = await createFactory();

			const result = await getPool({ ...args, certified: true });

			expect(result).toEqual(poolData);
			expect(certifiedService.getPool).toHaveBeenCalledExactlyOnceWith(args);
			expect(service.getPool).not.toHaveBeenCalled();
		});

		it('returns pool data from a query when certified is false', async () => {
			service.getPool.mockResolvedValue({ ok: poolData });

			const { getPool } = await createFactory();

			const result = await getPool({ ...args, certified: false });

			expect(result).toEqual(poolData);
			expect(service.getPool).toHaveBeenCalledExactlyOnceWith(args);
			expect(certifiedService.getPool).not.toHaveBeenCalled();
		});

		it('throws CanisterInternalError if result is error variant', async () => {
			certifiedService.getPool.mockResolvedValue(errorResponse);

			const { getPool } = await createFactory();

			const result = getPool(args);

			await expect(result).rejects.toThrow(
				new CanisterInternalError('Internal error: Failed to find pool')
			);
		});

		it('throws raw error if getPool method fails', async () => {
			certifiedService.getPool.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getPool } = await createFactory();

			const result = getPool(args);

			await expect(result).rejects.toThrow(mockResponseError);
		});

		it('throws error for unexpected structure', async () => {
			// @ts-expect-error for test purposes
			certifiedService.getPool.mockResolvedValue({ unexpected: true });

			const { getPool } = await createFactory();

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

			const { getPools } = await createFactory();

			const result = await getPools();

			expect(result).toEqual([poolData, poolData2]);
			expect(service.getPools).toHaveBeenCalledOnce();
		});

		it('returns empty array when no pools exist', async () => {
			service.getPools.mockResolvedValue({ ok: [] });

			const { getPools } = await createFactory();

			const result = await getPools();

			expect(result).toEqual([]);
		});

		it('throws CanisterInternalError if result is error variant', async () => {
			service.getPools.mockResolvedValue({ err: { InternalError: 'Failed to fetch pools' } });

			const { getPools } = await createFactory();

			await expect(getPools()).rejects.toThrow(
				new CanisterInternalError('Internal error: Failed to fetch pools')
			);
		});

		it('throws raw error if getPools method fails', async () => {
			service.getPools.mockImplementation(() => {
				throw mockResponseError;
			});

			const { getPools } = await createFactory();

			await expect(getPools()).rejects.toThrow(mockResponseError);
		});
	});
});
