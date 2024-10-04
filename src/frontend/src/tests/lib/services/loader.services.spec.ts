import * as api from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import { initSignerAllowance } from '$lib/services/loader.services';
import { authStore } from '$lib/stores/auth.store';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import type { MockInstance } from 'vitest';

describe('loader.services', () => {
	describe('initSignerAllowance', () => {
		let apiMock: MockInstance;

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();

			apiMock = vi.spyOn(api, 'allowSigning');

			const identity = Ed25519KeyIdentity.generate();
			authStore.setForTesting(identity);
		});

		it('should return success', async () => {
			apiMock.mockResolvedValueOnce(undefined);

			const result = await initSignerAllowance();

			expect(result.success).toBeTruthy();
		});

		it('should return success equals to false', async () => {
			apiMock.mockImplementation(async () => {
				throw new CanisterInternalError('Test');
			});

			const result = await initSignerAllowance();

			expect(result.success).toBeFalsy();
		});
	});
});
