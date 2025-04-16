import * as constants from '$lib/constants/app.constants';
import { authStore } from '$lib/stores/auth.store';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { get } from 'svelte/store';

describe('auth.store', () => {
	describe('setForTesting', () => {
		const identity = Ed25519KeyIdentity.generate();

		it('should set the identity for testing', () => {
			expect(() => authStore.setForTesting(identity)).not.toThrow();

			const storeIdentity = get(authStore).identity;

			expect(storeIdentity).toBe(identity);
		});

		it('should throw an error if not TEST environment', () => {
			const spy = vi.spyOn(constants, 'TEST', 'get').mockReturnValue(false);

			expect(() => authStore.setForTesting(identity)).toThrow(
				'This function should only be used in npm run test environment'
			);

			spy.mockRestore();
		});
	});
});
