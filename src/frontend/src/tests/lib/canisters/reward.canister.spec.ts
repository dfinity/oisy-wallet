import type {
	NewVipRewardResponse,
	_SERVICE as RewardService,
	UserData
} from '$declarations/rewards/rewards.did';
import { RewardCanister } from '$lib/canisters/reward.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { HttpAgent, type ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { fromNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

vi.mock(import('$lib/actors/agents.ic'), async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		// eslint-disable-next-line require-await
		getAgent: async () => mock<HttpAgent>()
	};
});

describe('reward.canister', () => {
	const createRewardCanister = ({
		serviceOverride
	}: Pick<CreateCanisterOptions<RewardService>, 'serviceOverride'>): Promise<RewardCanister> =>
		RewardCanister.create({
			canisterId: Principal.fromText('tdxud-2yaaa-aaaad-aadiq-cai'),
			identity: mockIdentity,
			certifiedServiceOverride: serviceOverride,
			serviceOverride
		});
	const service = mock<ActorSubclass<RewardService>>();
	const mockResponseError = new Error('Test response error');
	const queryParams = {
		certified: false
	};

	describe('getUserInfo', () => {
		it('returns true if user is vip', async () => {
			const mockedUserData: UserData = {
				is_vip: [true],
				airdrops: [],
				sprinkles: []
			};
			service.user_info.mockResolvedValue(mockedUserData);

			const { getUserInfo } = await createRewardCanister({
				serviceOverride: service
			});

			const userData = await getUserInfo(queryParams);
			expect(service.user_info).toHaveBeenCalledWith();
			expect(userData.is_vip.length).toBe(1);
			expect(fromNullable(userData.is_vip) === true).toBeTruthy();
		});

		it('returns false if user is not vip', async () => {
			const mockedUserData: UserData = {
				is_vip: [false],
				airdrops: [],
				sprinkles: []
			};
			service.user_info.mockResolvedValue(mockedUserData);

			const { getUserInfo } = await createRewardCanister({
				serviceOverride: service
			});

			const userData = await getUserInfo(queryParams);
			expect(userData.is_vip.length).toBe(1);
			expect(fromNullable(userData.is_vip) === true).toBeFalsy();
		});

		it('should throw an error if user_info throws', async () => {
			service.user_info.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getUserInfo } = await createRewardCanister({
				serviceOverride: service
			});

			const result = getUserInfo(queryParams);
			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('getNewVipReward', () => {
		it('returns new vip reward response', async () => {
			const mockedRewardResponse: NewVipRewardResponse = {
				VipReward: {
					code: '1234567890'
				}
			};
			service.new_vip_reward.mockResolvedValue(mockedRewardResponse);

			const { getNewVipReward } = await createRewardCanister({
				serviceOverride: service
			});

			const vipRewardResponse = await getNewVipReward();
			expect(service.new_vip_reward).toHaveBeenCalledWith();
			expect(vipRewardResponse).toEqual(mockedRewardResponse);
		});

		it('should throw an error if new_vip_reward throws', async () => {
			service.new_vip_reward.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getNewVipReward } = await createRewardCanister({
				serviceOverride: service
			});

			const result = getNewVipReward();
			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('claimVipReward', () => {
		it('should be possible to claim a vip reward', async () => {
			const mockedClaimResponse = { Success: null };
			service.claim_vip_reward.mockResolvedValue(mockedClaimResponse);

			const { claimVipReward } = await createRewardCanister({
				serviceOverride: service
			});

			const vipReward = { code: '1234567890' };
			const claimResponse = await claimVipReward(vipReward);
			expect(service.claim_vip_reward).toHaveBeenCalledWith(vipReward);
			expect(claimResponse).toEqual(mockedClaimResponse);
		});

		it('should throw an error if claim_vip_reward throws', async () => {
			service.claim_vip_reward.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { claimVipReward } = await createRewardCanister({
				serviceOverride: service
			});

			const result = claimVipReward({ code: '1234567890' });
			await expect(result).rejects.toThrow(mockResponseError);
		});
	});
});
