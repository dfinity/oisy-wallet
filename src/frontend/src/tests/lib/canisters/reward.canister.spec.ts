import type {
	ClaimVipRewardResponse,
	ClaimedVipReward,
	EligibilityResponse,
	NewVipRewardResponse,
	ReferrerInfo,
	_SERVICE as RewardService,
	UserData,
	UserSnapshot
} from '$declarations/rewards/rewards.did';
import { RewardCanister } from '$lib/canisters/reward.canister';
import type { CreateCanisterOptions } from '$lib/types/canister';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { fromNullable, toNullable } from '@dfinity/utils';
import { mock } from 'vitest-mock-extended';

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

	describe('isEligible', () => {
		it('should return new eligibility report', async () => {
			const mockEligibilityResponse: EligibilityResponse = { Ok: { campaigns: [] } };
			service.eligible.mockResolvedValue(mockEligibilityResponse);

			const { isEligible } = await createRewardCanister({
				serviceOverride: service
			});

			const eligibilityReport = await isEligible(queryParams);

			expect(service.eligible).toHaveBeenCalledWith([]);
			expect(eligibilityReport).toEqual(mockEligibilityResponse.Ok);
		});

		it('should throw an error if eligible throws', async () => {
			service.eligible.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { isEligible } = await createRewardCanister({
				serviceOverride: service
			});

			const result = isEligible(queryParams);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('getUserInfo', () => {
		describe('VIP', () => {
			it('returns true if user is vip', async () => {
				const mockedUserData: UserData = {
					is_vip: [true],
					superpowers: toNullable(['vip']),
					airdrops: [],
					usage_awards: [],
					last_snapshot_timestamp: [BigInt(Date.now())],
					sprinkles: []
				};
				service.user_info.mockResolvedValue(mockedUserData);

				const { getUserInfo } = await createRewardCanister({
					serviceOverride: service
				});

				const userData = await getUserInfo(queryParams);

				expect(service.user_info).toHaveBeenCalledWith();
				expect(userData.superpowers[0]?.length).toBe(1);
				expect(fromNullable(userData.superpowers)?.includes('vip') === true).toBeTruthy();
			});

			it('returns false if user is not vip', async () => {
				const mockedUserData: UserData = {
					is_vip: [false],
					superpowers: [],
					airdrops: [],
					usage_awards: [],
					last_snapshot_timestamp: [BigInt(Date.now())],
					sprinkles: []
				};
				service.user_info.mockResolvedValue(mockedUserData);

				const { getUserInfo } = await createRewardCanister({
					serviceOverride: service
				});

				const userData = await getUserInfo(queryParams);

				expect(userData.superpowers).toHaveLength(0);
				expect(fromNullable(userData.superpowers)?.includes('vip') === true).toBeFalsy();
			});
		});

		describe('Gold', () => {
			it('returns true if user is gold user', async () => {
				const mockedUserData: UserData = {
					is_vip: [true],
					superpowers: toNullable(['gold']),
					airdrops: [],
					usage_awards: [],
					last_snapshot_timestamp: [BigInt(Date.now())],
					sprinkles: []
				};
				service.user_info.mockResolvedValue(mockedUserData);

				const { getUserInfo } = await createRewardCanister({
					serviceOverride: service
				});

				const userData = await getUserInfo(queryParams);

				expect(service.user_info).toHaveBeenCalledWith();
				expect(userData.superpowers[0]?.length).toBe(1);
				expect(fromNullable(userData.superpowers)?.includes('gold') === true).toBeTruthy();
			});

			it('returns false if user is not gold user', async () => {
				const mockedUserData: UserData = {
					is_vip: [false],
					superpowers: [],
					airdrops: [],
					usage_awards: [],
					last_snapshot_timestamp: [BigInt(Date.now())],
					sprinkles: []
				};
				service.user_info.mockResolvedValue(mockedUserData);

				const { getUserInfo } = await createRewardCanister({
					serviceOverride: service
				});

				const userData = await getUserInfo(queryParams);

				expect(userData.superpowers).toHaveLength(0);
				expect(fromNullable(userData.superpowers)?.includes('gold') === true).toBeFalsy();
			});
		});

		it('returns true if user is vip and gold user', async () => {
			const mockedUserData: UserData = {
				is_vip: [true],
				superpowers: toNullable(['vip', 'gold']),
				airdrops: [],
				usage_awards: [],
				last_snapshot_timestamp: [BigInt(Date.now())],
				sprinkles: []
			};
			service.user_info.mockResolvedValue(mockedUserData);

			const { getUserInfo } = await createRewardCanister({
				serviceOverride: service
			});

			const userData = await getUserInfo(queryParams);

			expect(service.user_info).toHaveBeenCalledWith();
			expect(userData.superpowers[0]?.length).toBe(2);
			expect(fromNullable(userData.superpowers)?.includes('vip') === true).toBeTruthy();
			expect(fromNullable(userData.superpowers)?.includes('gold') === true).toBeTruthy();
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

			const rewardType: ClaimedVipReward = { campaign_id: 'vip' };
			const vipRewardResponse = await getNewVipReward(rewardType);

			expect(service.new_vip_reward).toHaveBeenCalledWith(toNullable(rewardType));
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

			const result = getNewVipReward({ campaign_id: 'vip' });

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('claimVipReward', () => {
		it('should be possible to claim a vip reward', async () => {
			const mockedClaimResponse: [ClaimVipRewardResponse, [] | [ClaimedVipReward]] = [
				{ Success: null },
				[{ campaign_id: 'vip' }]
			];
			service.claim_vip_reward.mockResolvedValue(mockedClaimResponse);

			const { claimVipReward } = await createRewardCanister({
				serviceOverride: service
			});

			const vipReward = { code: '1234567890' };
			const claimResponse = await claimVipReward(vipReward);

			expect(service.claim_vip_reward).toHaveBeenCalledWith(vipReward);
			expect(claimResponse).toEqual({
				claimRewardResponse: { Success: null },
				claimedVipReward: { campaign_id: 'vip' }
			});
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

	describe('getReferrerInfo', () => {
		it('should return referrer info', async () => {
			const mockedReferrerInfo: ReferrerInfo = {
				referral_code: 123343,
				num_referrals: [2]
			};

			service.referrer_info.mockResolvedValue(mockedReferrerInfo);

			const { getReferrerInfo } = await createRewardCanister({
				serviceOverride: service
			});

			const referrerInfo = await getReferrerInfo(queryParams);

			expect(service.referrer_info).toHaveBeenCalledWith();
			expect(referrerInfo).toEqual(mockedReferrerInfo);
		});

		it('should throw an error if referrer_info throws', async () => {
			service.referrer_info.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { getReferrerInfo } = await createRewardCanister({
				serviceOverride: service
			});

			const result = getReferrerInfo(queryParams);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('setReferrer', () => {
		const mockedReferrerCode = 123456;

		it('should be possible to set referrer', async () => {
			const { setReferrer } = await createRewardCanister({
				serviceOverride: service
			});

			await setReferrer(mockedReferrerCode);

			expect(service.set_referrer).toHaveBeenCalledWith(mockedReferrerCode);
		});

		it('should throw an error if set_referrer throws', async () => {
			service.set_referrer.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { setReferrer } = await createRewardCanister({
				serviceOverride: service
			});

			const result = setReferrer(mockedReferrerCode);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});

	describe('registerAirdropRecipient', () => {
		const mockUserSnapshot: UserSnapshot = {
			accounts: [],
			timestamp: toNullable(BigInt(Date.now()))
		};

		it('should register an user as a recipient', async () => {
			const { registerAirdropRecipient } = await createRewardCanister({
				serviceOverride: service
			});

			await registerAirdropRecipient(mockUserSnapshot);

			expect(service.register_airdrop_recipient).toHaveBeenCalledWith(mockUserSnapshot);
		});

		it('should throw an error if register_airdrop_recipient throws', async () => {
			service.register_airdrop_recipient.mockImplementation(async () => {
				await Promise.resolve();
				throw mockResponseError;
			});

			const { registerAirdropRecipient } = await createRewardCanister({
				serviceOverride: service
			});

			const result = registerAirdropRecipient(mockUserSnapshot);

			await expect(result).rejects.toThrow(mockResponseError);
		});
	});
});
