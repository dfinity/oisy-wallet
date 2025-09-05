import UrlGuard from '$lib/components/guard/UrlGuard.svelte';
import { QrCodeType } from '$lib/enums/qr-code-types';
import * as rewardService from '$lib/services/reward.services';
import { loading } from '$lib/stores/loader.store';
import { modalStore } from '$lib/stores/modal.store';
import * as navUtils from '$lib/utils/nav.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';
import { get } from 'svelte/store';

describe('UrlGuard', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPage.reset();
		modalStore.close();

		loading.set(false);
		mockAuthStore();
	});

	describe('Code', () => {
		it('should claim reward', async () => {
			const code = '123456';
			const rewardUrl = new URL(`http://localhost:5173/?code=${code}`);

			mockPage.mockUrl(rewardUrl);

			const claimRewardSpy = vi
				.spyOn(rewardService, 'claimVipReward')
				.mockResolvedValue({ success: true });
			const removeSearchParamSpy = vi
				.spyOn(navUtils, 'removeSearchParam')
				.mockImplementation(vi.fn());

			render(UrlGuard);

			await vi.waitFor(() => {
				expect(claimRewardSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					code
				});

				expect(removeSearchParamSpy).toHaveBeenCalledWith({
					url: rewardUrl,
					searchParam: 'code'
				});

				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { success: true, codeType: QrCodeType.VIP },
					type: 'vip-reward-state'
				});
			});
		});

		it('should get result false while claiming reward', async () => {
			const code = '123456';
			const rewardUrl = new URL(`http://localhost:5173/?code=${code}`);

			mockPage.mockUrl(rewardUrl);

			const claimRewardSpy = vi
				.spyOn(rewardService, 'claimVipReward')
				.mockResolvedValue({ success: false });
			const removeSearchParamSpy = vi
				.spyOn(navUtils, 'removeSearchParam')
				.mockImplementation(vi.fn());

			render(UrlGuard);

			await vi.waitFor(() => {
				expect(claimRewardSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					code
				});

				expect(removeSearchParamSpy).toHaveBeenCalledWith({
					url: rewardUrl,
					searchParam: 'code'
				});

				expect(get(modalStore)).toEqual({
					id: get(modalStore)?.id,
					data: { success: false, codeType: QrCodeType.VIP },
					type: 'vip-reward-state'
				});
			});
		});

		it('should do nothing if no reward code search param is provided', async () => {
			const rewardUrl = new URL(`http://localhost:5173/`);

			mockPage.mockUrl(rewardUrl);

			const claimRewardSpy = vi
				.spyOn(rewardService, 'claimVipReward')
				.mockResolvedValue({ success: false });
			const removeSearchParamSpy = vi
				.spyOn(navUtils, 'removeSearchParam')
				.mockImplementation(vi.fn());

			render(UrlGuard);

			await vi.waitFor(() => {
				expect(claimRewardSpy).not.toHaveBeenCalled();
				expect(removeSearchParamSpy).not.toHaveBeenCalled();
				expect(get(modalStore)).toBeNull();
			});
		});
	});

	describe('Referrer', () => {
		it('should establish connection between user and referrer', async () => {
			const referrerCode = 123456;
			const referrerUrl = new URL(`http://localhost:5173/?referrer=${referrerCode}`);

			mockPage.mockUrl(referrerUrl);

			const setReferrerSpy = vi.spyOn(rewardService, 'setReferrer').mockImplementation(vi.fn());
			const removeSearchParamSpy = vi
				.spyOn(navUtils, 'removeSearchParam')
				.mockImplementation(vi.fn());

			render(UrlGuard);

			await vi.waitFor(() => {
				expect(setReferrerSpy).toHaveBeenCalledWith({
					identity: mockIdentity,
					referrerCode
				});

				expect(removeSearchParamSpy).toHaveBeenCalledWith({
					url: referrerUrl,
					searchParam: 'referrer'
				});
			});
		});

		it('should just remove search param if referral code is invalid', async () => {
			const referrerCode = 'abcdef';
			const referrerUrl = new URL(`http://localhost:5173/?referrer=${referrerCode}`);

			mockPage.mockUrl(referrerUrl);

			const setReferrerSpy = vi.spyOn(rewardService, 'setReferrer').mockImplementation(vi.fn());
			const removeSearchParamSpy = vi
				.spyOn(navUtils, 'removeSearchParam')
				.mockImplementation(vi.fn());

			render(UrlGuard);

			await vi.waitFor(() => {
				expect(setReferrerSpy).not.toHaveBeenCalled();

				expect(removeSearchParamSpy).toHaveBeenCalledWith({
					url: referrerUrl,
					searchParam: 'referrer'
				});
			});
		});

		it('should do nothing if no referrer search param is provided', async () => {
			const referrerUrl = new URL(`http://localhost:5173/`);

			mockPage.mockUrl(referrerUrl);

			const setReferrerSpy = vi.spyOn(rewardService, 'setReferrer').mockImplementation(vi.fn());
			const removeSearchParamSpy = vi
				.spyOn(navUtils, 'removeSearchParam')
				.mockImplementation(vi.fn());

			render(UrlGuard);

			await vi.waitFor(() => {
				expect(setReferrerSpy).not.toHaveBeenCalled();
				expect(removeSearchParamSpy).not.toHaveBeenCalled();
			});
		});
	});
});
