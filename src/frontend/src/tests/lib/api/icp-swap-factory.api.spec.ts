import type { PoolData } from '$declarations/icp_swap_factory/icp_swap_factory.did';
import { getPoolCanister } from '$lib/api/icp-swap-factory.api';
import { ICPSwapFactoryCanister } from '$lib/canisters/icp-swap-factory.canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { Principal } from '@icp-sdk/core/principal';
import { mock } from 'vitest-mock-extended';

describe('icp-swap-factory.api', () => {
	const factoryCanisterMock = mock<ICPSwapFactoryCanister>();

	const baseParams = {
		identity: mockIdentity,
		canisterId: '4mmnk-kiaaa-aaaag-qbllq-cai'
	};

	const poolArgs = {
		token0: { address: 'ryjl3-tyaaa-aaaaa-aaaba-cai', standard: 'icp' },
		token1: { address: 'mxzaz-hqaaa-aaaar-qaada-cai', standard: 'icrc' },
		fee: 3000n
	};

	const poolData: PoolData = {
		...poolArgs,
		canisterId: Principal.fromText('xmiu5-jqaaa-aaaag-qbz7q-cai'),
		key: 'mxzaz-hqaaa-aaaar-qaada-cai_ryjl3-tyaaa-aaaaa-aaaba-cai_3000',
		tickSpacing: 60n
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.spyOn(ICPSwapFactoryCanister, 'create').mockResolvedValue(factoryCanisterMock);

		factoryCanisterMock.getPool.mockResolvedValue(poolData);
	});

	describe('getPoolCanister', () => {
		it('leaves certified unset when the caller does not pass it, so the canister default applies', async () => {
			const result = await getPoolCanister({ ...baseParams, ...poolArgs });

			expect(result).toStrictEqual(poolData);
			expect(factoryCanisterMock.getPool).toHaveBeenCalledExactlyOnceWith(poolArgs);
		});

		it.each([true, false])('forwards certified: %s to the canister', async (certified) => {
			await getPoolCanister({ ...baseParams, ...poolArgs, certified });

			expect(factoryCanisterMock.getPool).toHaveBeenCalledExactlyOnceWith({
				...poolArgs,
				certified
			});
		});

		it('throws if identity is undefined', async () => {
			await expect(
				getPoolCanister({ ...baseParams, identity: undefined, ...poolArgs })
			).rejects.toThrow();

			expect(factoryCanisterMock.getPool).not.toHaveBeenCalled();
		});
	});
});
