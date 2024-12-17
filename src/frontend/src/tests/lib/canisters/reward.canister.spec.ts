import type { _SERVICE as BackendService } from '$declarations/backend/backend.did';
import { RewardCanister } from '$lib/canisters/reward.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { mock } from 'vitest-mock-extended';

describe('reward.canister', () => {
	// TODO replace BackendService with RewardService
	const createRewardCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<BackendService>, 'serviceOverride'>): Promise<RewardCanister> =>
		RewardCanister.create({
			canisterId: Principal.fromText('tdxud-2yaaa-aaaad-aadiq-cai'),
			identity: mockIdentity
		});
	const service = mock<ActorSubclass<BackendService>>(); // TODO replace BackendService with RewardService
	const mockResponseError = new Error('Test response error');

	it('returns true if user is vip', async () => {
		service.is_vip.mockResolvedValue(true);

		const { isVip } = await createRewardCanister({
			serviceOverride: service
		});

		const result = await isVip();

		expect(result).toBeTruthy();
	});

	it('should throw an error if is_vip throws', async () => {
		service.is_vip.mockImplementation(async () => {
			await Promise.resolve();
			throw mockResponseError;
		});

		const { isVip } = await createRewardCanister({
			serviceOverride: service
		});

		const result = isVip();

		await expect(result).rejects.toThrow(mockResponseError);
	});

	it('returns reward code', async () => {
		service.get_reward_code.mockResolvedValue('1234567890');

		const { getRewardCode } = await createRewardCanister({
			serviceOverride: service
		});

		const rewardCode = await getRewardCode();

		expect(rewardCode).toEqual('1234567890');
	});

	it('should throw an error if get_reward_code throws', async () => {
		service.get_reward_code.mockImplementation(async () => {
			await Promise.resolve();
			throw mockResponseError;
		});

		const { getRewardCode } = await createRewardCanister({
			serviceOverride: service
		});

		const result = getRewardCode();

		await expect(result).rejects.toThrow(mockResponseError);
	});

	it('should be possible to use a reward code', async () => {
		service.use_reward_code.mockResolvedValue(true);

		const { useRewardCode } = await createRewardCanister({
			serviceOverride: service
		});

		const result = await useRewardCode('1234567890');

		expect(result).toBeTruthy();
	});

	it('should throw an error if use_reward_code throws', async () => {
		service.use_reward_code.mockImplementation(async () => {
			await Promise.resolve();
			throw mockResponseError;
		});

		const { useRewardCode } = await createRewardCanister({
			serviceOverride: service
		});

		const result = useRewardCode('1234567890');

		await expect(result).rejects.toThrow(mockResponseError);
	});
});
