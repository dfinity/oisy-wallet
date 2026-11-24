import * as api from '$lib/api/backend.api';
import { ALLOWANCE_REQUEST_COOLDOWN_MILLIS, ZERO } from '$lib/constants/app.constants';
import {
	requestAllowance,
	requestAllowanceAfterInsufficientAllowance,
	requestAllowanceAtLoad
} from '$lib/services/allowance-request.services';
import { trackRateLimited } from '$lib/services/analytics.services';
import { allowanceIssueStore } from '$lib/stores/allowance-issue.store';
import { allowanceToastStore } from '$lib/stores/allowance-toast.store';
import type { AllowSigningOutcome } from '$lib/types/api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';
import type { MockInstance } from 'vitest';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn(),
	trackRateLimited: vi.fn()
}));

describe('allowance-request.services', () => {
	const grantedOutcome: AllowSigningOutcome = {
		response: { status: { Executed: null }, allowed_cycles: 2_917_000_000_000n }
	};

	const skippedOutcome: AllowSigningOutcome = {
		response: { status: { Skipped: null }, allowed_cycles: 1_500_000_000_000n }
	};

	const rateLimitedOutcome: AllowSigningOutcome = {
		response: { status: { Skipped: null }, allowed_cycles: ZERO },
		rateLimitInfo: { endpoint: 'allow_signing', limiter: 'ALLOW_SIGNING_RATE_LIMITER' }
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();

		allowanceIssueStore.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('requestAllowance', () => {
		it('should answer granted and clear the allowance issue', async () => {
			allowanceIssueStore.setRefused();
			vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS);
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(grantedOutcome);

			await expect(requestAllowance(mockIdentity)).resolves.toEqual({
				answer: 'granted',
				allowance: 2_917_000_000_000n
			});

			expect(get(allowanceIssueStore)).toBeUndefined();
		});

		it('should answer skipped and clear the allowance issue', async () => {
			allowanceIssueStore.setRefused();
			vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS);
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(skippedOutcome);

			await expect(requestAllowance(mockIdentity)).resolves.toEqual({
				answer: 'skipped',
				allowance: 1_500_000_000_000n
			});

			expect(get(allowanceIssueStore)).toBeUndefined();
		});

		it('should answer refused when a rate limit stopped the request, and set the allowance issue', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(rateLimitedOutcome);

			await expect(requestAllowance(mockIdentity)).resolves.toEqual({ answer: 'refused' });

			expect(get(allowanceIssueStore)).toEqual({ refusedAt: Date.now() });
			expect(trackRateLimited).toHaveBeenCalledExactlyOnceWith(rateLimitedOutcome.rateLimitInfo);
		});

		it('should answer refused when the request fails, and set the allowance issue', async () => {
			vi.spyOn(api, 'allowSigning').mockRejectedValueOnce(new Error('test'));

			await expect(requestAllowance(mockIdentity)).resolves.toEqual({ answer: 'refused' });

			expect(get(allowanceIssueStore)).toEqual({ refusedAt: Date.now() });
		});

		it('should answer refused when the backend returns a failed status', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce({
				response: { status: { Failed: null }, allowed_cycles: ZERO }
			});

			await expect(requestAllowance(mockIdentity)).resolves.toEqual({ answer: 'refused' });

			expect(get(allowanceIssueStore)).toEqual({ refusedAt: Date.now() });
		});

		it('should send one request for callers that ask at the same time', async () => {
			const pending = Promise.withResolvers<AllowSigningOutcome>();
			const spy = vi.spyOn(api, 'allowSigning').mockReturnValueOnce(pending.promise);

			const first = requestAllowance(mockIdentity);
			const second = requestAllowance(mockIdentity);

			pending.resolve(grantedOutcome);

			await expect(first).resolves.toEqual({ answer: 'granted', allowance: 2_917_000_000_000n });
			await expect(second).resolves.toEqual({ answer: 'granted', allowance: 2_917_000_000_000n });

			expect(spy).toHaveBeenCalledOnce();
		});

		it('should send no request during the cooldown after a refused one', async () => {
			const spy = vi.spyOn(api, 'allowSigning').mockResolvedValue(rateLimitedOutcome);

			await requestAllowance(mockIdentity);

			vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS - 1);

			await expect(requestAllowance(mockIdentity)).resolves.toEqual({ answer: 'refused' });

			expect(spy).toHaveBeenCalledOnce();
		});

		it('should send a request again once the cooldown has passed, and restart it when refused', async () => {
			const spy = vi.spyOn(api, 'allowSigning').mockResolvedValue(rateLimitedOutcome);

			await requestAllowance(mockIdentity);

			vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS);

			await requestAllowance(mockIdentity);

			expect(spy).toHaveBeenCalledTimes(2);
			expect(get(allowanceIssueStore)).toEqual({ refusedAt: Date.now() });
		});

		it('should not wait for a cooldown when no allowance issue is set', async () => {
			const spy = vi
				.spyOn(api, 'allowSigning')
				.mockResolvedValueOnce(grantedOutcome)
				.mockResolvedValueOnce(skippedOutcome);

			await requestAllowance(mockIdentity);
			await requestAllowance(mockIdentity);

			expect(spy).toHaveBeenCalledTimes(2);
		});
	});

	describe('requestAllowanceAfterInsufficientAllowance', () => {
		const allowance = 5_000_000_000n;

		let toastSpy: MockInstance;

		beforeEach(() => {
			toastSpy = vi.spyOn(allowanceToastStore, 'set');
		});

		it('should repeat after a granted request, without a toast', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(grantedOutcome);

			await expect(
				requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance })
			).resolves.toEqual({ repeat: true, answer: 'granted' });

			expect(toastSpy).not.toHaveBeenCalled();
		});

		it('should repeat after a skipped request with a larger allowance than the failed call stated', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(skippedOutcome);

			await expect(
				requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance })
			).resolves.toEqual({ repeat: true, answer: 'skipped' });

			expect(toastSpy).not.toHaveBeenCalled();
		});

		it('should ask for the warning that the call costs more than the allowance after a skipped request with no larger allowance', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(skippedOutcome);

			await expect(
				requestAllowanceAfterInsufficientAllowance({
					identity: mockIdentity,
					allowance: 1_500_000_000_000n
				})
			).resolves.toEqual({ repeat: false, answer: 'skipped' });

			expect(toastSpy).toHaveBeenCalledExactlyOnceWith({ toast: 'exceeded' });
			expect(get(allowanceIssueStore)).toBeUndefined();
		});

		it('should ask for the allowance-issue toast after a refused request', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(rateLimitedOutcome);

			await expect(
				requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance })
			).resolves.toEqual({ repeat: false, answer: 'refused' });

			expect(toastSpy).toHaveBeenCalledExactlyOnceWith({ toast: 'issue' });
			expect(get(allowanceIssueStore)).toEqual({ refusedAt: Date.now() });
		});

		it('should ask for the allowance-issue toast again, without a request, for a call failing in the cooldown', async () => {
			const spy = vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(rateLimitedOutcome);

			await requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance });
			await requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance });

			expect(spy).toHaveBeenCalledOnce();
			expect(toastSpy).toHaveBeenCalledTimes(2);
			expect(toastSpy).toHaveBeenNthCalledWith(2, { toast: 'issue' });
		});

		it('should repeat, and clear the allowance issue, once a request after the cooldown is granted', async () => {
			vi.spyOn(api, 'allowSigning')
				.mockResolvedValueOnce(rateLimitedOutcome)
				.mockResolvedValueOnce(grantedOutcome);

			await requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance });

			vi.advanceTimersByTime(ALLOWANCE_REQUEST_COOLDOWN_MILLIS);

			await expect(
				requestAllowanceAfterInsufficientAllowance({ identity: mockIdentity, allowance })
			).resolves.toEqual({ repeat: true, answer: 'granted' });

			expect(toastSpy).toHaveBeenCalledOnce();
			expect(get(allowanceIssueStore)).toBeUndefined();
		});
	});

	describe('requestAllowanceAtLoad', () => {
		it('should clear the allowance issue when granted', async () => {
			allowanceIssueStore.setRefused();
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(grantedOutcome);

			await requestAllowanceAtLoad(mockIdentity);

			expect(get(allowanceIssueStore)).toBeUndefined();
		});

		it('should clear the allowance issue when skipped', async () => {
			allowanceIssueStore.setRefused();
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(skippedOutcome);

			await requestAllowanceAtLoad(mockIdentity);

			expect(get(allowanceIssueStore)).toBeUndefined();
		});

		it('should set no allowance issue when refused', async () => {
			vi.spyOn(api, 'allowSigning').mockResolvedValueOnce(rateLimitedOutcome);

			await requestAllowanceAtLoad(mockIdentity);

			expect(get(allowanceIssueStore)).toBeUndefined();
			expect(trackRateLimited).toHaveBeenCalledExactlyOnceWith(rateLimitedOutcome.rateLimitInfo);
		});

		it('should leave an allowance issue and its cooldown as they are when refused', async () => {
			allowanceIssueStore.setRefused();
			const issue = get(allowanceIssueStore);
			vi.advanceTimersByTime(1_000);
			vi.spyOn(api, 'allowSigning').mockRejectedValueOnce(new Error('test'));

			await expect(requestAllowanceAtLoad(mockIdentity)).resolves.toBeUndefined();

			expect(get(allowanceIssueStore)).toBe(issue);
		});
	});
});
