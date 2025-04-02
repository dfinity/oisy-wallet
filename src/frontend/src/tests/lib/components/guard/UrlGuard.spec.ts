import UrlGuard from '$lib/components/guard/UrlGuard.svelte';
import * as rewardService from '$lib/services/reward.services';
import { loading } from '$lib/stores/loader.store';
import * as navUtils from '$lib/utils/nav.utils';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { render } from '@testing-library/svelte';

describe('UrlGuard', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mockPage.reset();
	});

	describe('Referrer', () => {
		beforeEach(() => {
			loading.set(false);
			mockAuthStore();
		});

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
