import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	UserData
} from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import { claimVipReward, getNewReward, getVipStatus } from '$lib/services/reward-code.services';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { vi } from 'vitest';

const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('reward-code', () => {
	const mockedUserData: UserData = {
		is_vip: [true],
		airdrops: [],
		sprinkles: []
	};

	const mockedNewRewardResponse: NewVipRewardResponse = {
		VipReward: {
			code: '1234567890'
		}
	};

	const mockedClaimRewardResponse: ClaimVipRewardResponse = {
		Success: null
	};

	it('should return true if user is vip', async () => {
		const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

		const isVip = await getVipStatus(mockIdentity);

		expect(getUserInfoSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			nullishIdentityErrorMessage
		});
		expect(isVip).toBeTruthy();
	});

	it('should return false if user is not vip', async () => {
		const userData: UserData = { ...mockedUserData, is_vip: [false] };
		const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(userData);

		const isVip = await getVipStatus(mockIdentity);

		expect(getUserInfoSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			nullishIdentityErrorMessage
		});
		expect(isVip).toBeFalsy();
	});

	it('should get a vip reward code for vip user', async () => {
		const getNewVipRewardSpy = vi
			.spyOn(rewardApi, 'getNewVipReward')
			.mockResolvedValue(mockedNewRewardResponse);

		const vipReward = await getNewReward(mockIdentity);

		expect(getNewVipRewardSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			nullishIdentityErrorMessage
		});
		expect(vipReward).toEqual(mockedNewRewardResponse.VipReward);
	});

	it('should throw an error for non vip user', async () => {
		const newRewardResponse: NewVipRewardResponse = { NotImportantPerson: null };
		const getNewVipRewardSpy = vi
			.spyOn(rewardApi, 'getNewVipReward')
			.mockResolvedValue(newRewardResponse);

		const result = getNewReward(mockIdentity);

		expect(getNewVipRewardSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			nullishIdentityErrorMessage
		});
		await expect(result).rejects.toThrow('User is not VIP');
	});

	it('should return true if a valid vip reward code is used', async () => {
		const claimRewardSpy = vi
			.spyOn(rewardApi, 'claimVipReward')
			.mockResolvedValue(mockedClaimRewardResponse);

		const result = await claimVipReward({ identity: mockIdentity, code: '1234567890' });

		expect(claimRewardSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			vipReward: { code: '1234567890' },
			nullishIdentityErrorMessage
		});
		expect(result).toBeTruthy();
	});

	it('should return false if an invalid vip reward code is used', async () => {
		const claimRewardResponse: ClaimVipRewardResponse = { InvalidCode: null };
		const claimRewardSpy = vi
			.spyOn(rewardApi, 'claimVipReward')
			.mockResolvedValue(claimRewardResponse);

		const result = await claimVipReward({ identity: mockIdentity, code: '1234567890' });

		expect(claimRewardSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			vipReward: { code: '1234567890' },
			nullishIdentityErrorMessage
		});
		expect(result).toBeFalsy();
	});

	it('should return false if an already used vip reward code is used', async () => {
		const claimRewardResponse: ClaimVipRewardResponse = { AlreadyClaimed: null };
		const claimRewardSpy = vi
			.spyOn(rewardApi, 'claimVipReward')
			.mockResolvedValue(claimRewardResponse);

		const result = await claimVipReward({ identity: mockIdentity, code: '1234567890' });

		expect(claimRewardSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			vipReward: { code: '1234567890' },
			nullishIdentityErrorMessage
		});
		expect(result).toBeFalsy();
	});
});
