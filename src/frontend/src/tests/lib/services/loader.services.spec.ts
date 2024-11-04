import * as api from '$lib/api/backend.api';
import { CanisterInternalError } from '$lib/canisters/errors';
import * as authServices from '$lib/services/auth.services';
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

			Object.defineProperty(window, 'location', {
				writable: true,
				value: {
					href: 'https://oisy.com',
					reload: vi.fn()
				}
			});

			vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});
		});

		it('should return success', async () => {
			apiMock.mockResolvedValueOnce(undefined);

			const result = await initSignerAllowance();

			expect(result.success).toBeTruthy();
		});

		it('should return success equals to false', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			const result = await initSignerAllowance();

			expect(result.success).toBeFalsy();
		});

		it('should sign out and ultimately reload the window', async () => {
			apiMock.mockImplementation(() => {
				throw new CanisterInternalError('Test');
			});

			const spySignOut = vi.spyOn(authServices, 'errorSignOut');

			const spy = vi.spyOn(window.location, 'reload');

			await initSignerAllowance();

			expect(spySignOut).toHaveBeenCalledOnce();
			expect(spy).toHaveBeenCalledOnce();
		});
	});
});
