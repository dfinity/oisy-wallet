import * as api from '$lib/api/backend.api';
import { allowSigning } from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import { ZERO } from '$lib/constants/app.constants';
import { trackRateLimited } from '$lib/services/analytics.services';
import { replenishSignerAllowance } from '$lib/services/signer-allowance.services';
import { authStore } from '$lib/stores/auth.store';
import type { AllowSigningOutcome } from '$lib/types/api';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { MockInstance } from 'vitest';

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn(),
	trackRateLimited: vi.fn()
}));

describe('signer-allowance.services', () => {
	const mockExecutedOutcome: AllowSigningOutcome = {
		response: { status: { Executed: null }, allowed_cycles: 100n }
	};

	const mockRateLimitedOutcome: AllowSigningOutcome = {
		response: { status: { Skipped: null }, allowed_cycles: ZERO },
		rateLimitInfo: { endpoint: 'allow_signing', limiter: 'ALLOW_SIGNING_RATE_LIMITER' }
	};

	describe('replenishSignerAllowance', () => {
		let apiMock: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			apiMock = vi.spyOn(api, 'allowSigning');

			authStore.setForTesting(mockIdentity);

			// The error path logs via consoleWarn — suppress so the harness doesn't flag console output.
			vi.spyOn(console, 'warn').mockImplementation(() => {});
			vi.spyOn(console, 'debug').mockImplementation(() => {});
		});

		it('calls allow_signing for the authenticated identity', async () => {
			apiMock.mockResolvedValueOnce(mockExecutedOutcome);

			await replenishSignerAllowance();

			expect(allowSigning).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ identity: mockIdentity })
			);
		});

		it('tracks the rate-limited event when rateLimitInfo is present', async () => {
			apiMock.mockResolvedValueOnce(mockRateLimitedOutcome);

			await replenishSignerAllowance();

			expect(trackRateLimited).toHaveBeenCalledExactlyOnceWith(mockRateLimitedOutcome.rateLimitInfo);
		});

		it('does not track when not rate limited', async () => {
			apiMock.mockResolvedValueOnce(mockExecutedOutcome);

			await replenishSignerAllowance();

			expect(trackRateLimited).not.toHaveBeenCalled();
		});

		it('swallows errors and never throws (e.g. when the replenish itself is rate-limited)', async () => {
			apiMock.mockRejectedValueOnce(new CanisterInternalError('rate limited'));

			await expect(replenishSignerAllowance()).resolves.toBeUndefined();
		});

		it('is single-flight: concurrent calls trigger allow_signing only once', async () => {
			let release: () => void = () => {};
			apiMock.mockImplementation(
				() =>
					new Promise((resolve) => {
						release = () => resolve(mockExecutedOutcome);
					})
			);

			const first = replenishSignerAllowance();
			const second = replenishSignerAllowance();

			release();

			await Promise.all([first, second]);

			expect(allowSigning).toHaveBeenCalledOnce();
		});
	});
});
