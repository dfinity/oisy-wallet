import * as rewardApi from '$lib/api/reward.api';
import { getRewardCode, isVip, useRewardCode } from '$lib/services/reward-code.services';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { vi } from 'vitest';

const nullishIdentityErrorMessage = en.auth.error.no_internet_identity;

describe('reward-code', () => {
	const rewardCode = '1234567890';

	it('should be able to check if user is vip', async () => {
		const isVipSpy = vi.spyOn(rewardApi, 'isVip').mockResolvedValue(true);

		const vip = await isVip(mockIdentity);

		expect(isVipSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			nullishIdentityErrorMessage
		});
		expect(vip).toBeTruthy();
	});

	it('should get a vip reward code', async () => {
		const getRewardCodeSpy = vi.spyOn(rewardApi, 'getRewardCode').mockResolvedValue(rewardCode);

		const code = await getRewardCode(mockIdentity);

		expect(getRewardCodeSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			nullishIdentityErrorMessage
		});
		expect(code).toEqual(rewardCode);
	});

	it('should be possible to use a vip reward code', async () => {
		const useRewardCodeSpy = vi.spyOn(rewardApi, 'useRewardCode').mockResolvedValue(true);

		const result = await useRewardCode(mockIdentity, rewardCode);

		expect(useRewardCodeSpy).toHaveBeenCalledWith({
			identity: mockIdentity,
			code: rewardCode,
			nullishIdentityErrorMessage
		});
		expect(result).toEqual(true);
	});
});
