import type { _SERVICE as GldtStakeService } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { GldtStakeCanister } from '$icp/canisters/gldt_stake.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

describe('gldt_stake.canister', () => {
	const createGldtStakeCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<GldtStakeService>, 'serviceOverride'>) =>
		GldtStakeCanister.create({
			canisterId: Principal.fromText('sqpxs-piaaa-aaaaj-qneva-cai'),
			identity: mockIdentity,
			serviceOverride,
			certifiedServiceOverride: serviceOverride
		});

	const service = mock<ActorSubclass<GldtStakeService>>();
	const mockResponseError = new Error('gldt_stake error');

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('getApyOverall', () => {
		it('returns APY number successfully', async () => {
			const response = 10;

			service.get_apy_overall.mockResolvedValue(response);

			const { getApyOverall } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await getApyOverall();

			expect(result).toEqual(response);
			expect(service.get_apy_overall).toHaveBeenCalledOnce();
		});

		it('throws an error if get_apy_overall method fails', async () => {
			service.get_apy_overall.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getApyOverall } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = getApyOverall();

			await expect(res).rejects.toThrow(mockResponseError);
		});
	});
});
