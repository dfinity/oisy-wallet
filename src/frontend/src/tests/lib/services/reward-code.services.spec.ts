import type {
	ClaimVipRewardResponse,
	NewVipRewardResponse,
	UserData
} from '$declarations/rewards/rewards.did';
import * as rewardApi from '$lib/api/reward.api';
import { claimVipReward, getNewReward, isVipUser } from '$lib/services/reward-code.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { AlreadyClaimedError, InvalidCodeError } from '$lib/types/errors';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('reward-code', () => {
	beforeEach(() => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	describe('isVip', () => {
		const mockedUserData: UserData = {
			is_vip: [true],
			airdrops: [],
			sprinkles: []
		};

		it('should return true if user is vip', async () => {
			const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(mockedUserData);

			const result = await isVipUser({ identity: mockIdentity });

			expect(getUserInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(result).toEqual({ success: true });
		});

		it('should return false if user is not vip', async () => {
			const userData: UserData = { ...mockedUserData, is_vip: [false] };
			const getUserInfoSpy = vi.spyOn(rewardApi, 'getUserInfo').mockResolvedValue(userData);

			const result = await isVipUser({ identity: mockIdentity });

			expect(getUserInfoSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				certified: false,
				nullishIdentityErrorMessage
			});
			expect(result).toEqual({ success: false });
		});
	});

	describe('getNewReward', () => {
		const mockedNewRewardResponse: NewVipRewardResponse = {
			VipReward: {
				code: '1234567890'
			}
		};

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

		it('should display an error message for non vip user', async () => {
			const err = new Error('test');
			const getNewVipRewardSpy = vi.spyOn(rewardApi, 'getNewVipReward').mockRejectedValue(err);
			const spyToastsError = vi.spyOn(toastsStore, 'toastsError');

			await getNewReward(mockIdentity);

			expect(getNewVipRewardSpy).toHaveBeenCalledWith({
				identity: mockIdentity,
				nullishIdentityErrorMessage
			});
			expect(spyToastsError).toHaveBeenNthCalledWith(1, {
				msg: { text: get(i18n).vip.reward.error.loading_reward },
				err
			});
		});
	});

	describe('claimVipReward', () => {
		const mockedClaimRewardResponse: ClaimVipRewardResponse = {
			Success: null
		};

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
			expect(result).toEqual({ success: true });
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
			expect(result.success).toBeFalsy();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(InvalidCodeError);
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
			expect(result.success).toBeFalsy();
			expect(result.err).not.toBeUndefined();
			expect(result.err).toBeInstanceOf(AlreadyClaimedError);
		});
	});
});
