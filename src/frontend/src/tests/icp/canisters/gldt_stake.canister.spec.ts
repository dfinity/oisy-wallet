import type { _SERVICE as GldtStakeService } from '$declarations/gldt_stake/declarations/gldt_stake.did';
import { GldtStakeCanister } from '$icp/canisters/gldt_stake.canister';
import { CanisterInternalError } from '$lib/canisters/errors';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
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

	describe('manageStakePosition', () => {
		const params = { AddStake: { amount: 1n } };

		it('manages stake position successfully', async () => {
			service.manage_stake_position.mockResolvedValue({ Ok: stakePositionMockResponse });

			const { manageStakePosition } = await createGldtStakeCanister({ serviceOverride: service });

			const result = await manageStakePosition(params);

			expect(result).toEqual(stakePositionMockResponse);
			expect(service.manage_stake_position).toHaveBeenCalledWith(params);
		});

		it('throws an error if manage_stake_position method fails', async () => {
			service.manage_stake_position.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { manageStakePosition } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = manageStakePosition(params);

			await expect(res).rejects.toThrow(mockResponseError);
		});

		it('should throw an error if manage_stake_position returns an AddStakeError error', async () => {
			service.manage_stake_position.mockResolvedValue({
				Err: { AddStakeError: { TransferError: 'error' } }
			});

			const { manageStakePosition } = await createGldtStakeCanister({
				serviceOverride: service
			});

			const res = manageStakePosition(params);

			await expect(res).rejects.toThrow(new CanisterInternalError('Failed to add stake'));
		});
	});
});
