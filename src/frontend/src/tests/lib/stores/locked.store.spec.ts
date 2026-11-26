import { authLocked, type AuthLockStoreData } from '$lib/stores/locked.store';
import * as storageUtils from '$lib/utils/storage.utils';
import type { MockInstance } from 'vitest';

describe('authLocked store', () => {
	let spyStorageSet: MockInstance;
	let spyStorageGet: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		spyStorageSet = vi.spyOn(storageUtils, 'set');
		spyStorageGet = vi.spyOn(storageUtils, 'get').mockReturnValue(undefined);
	});

	describe('toggleLock', () => {
		it('should toggle from unlocked to a lock', () => {
			spyStorageGet.mockReturnValueOnce(false);

			authLocked.toggleLock({ source: 'toggle-test' });

			expect(spyStorageSet).toHaveBeenCalledWith({
				key: 'authLocked',
				value: 'lock'
			});
		});

		it('should toggle from a lock to unlocked', () => {
			spyStorageGet.mockReturnValueOnce(true);

			authLocked.toggleLock({ source: 'toggle-test' });

			expect(spyStorageSet).toHaveBeenCalledWith({
				key: 'authLocked',
				value: false
			});
		});
	});

	describe('lock', () => {
		afterEach(() => {
			authLocked.unlock();
		});

		it('should store a lock by default', () => {
			authLocked.lock({ source: 'lock-test' });

			expect(spyStorageSet).toHaveBeenCalledExactlyOnceWith({
				key: 'authLocked',
				value: 'lock'
			});
		});

		it('should store the reason it is given', () => {
			authLocked.lock({ source: 'lock-test', reason: 'expired' });

			expect(spyStorageSet).toHaveBeenCalledExactlyOnceWith({
				key: 'authLocked',
				value: 'expired'
			});
		});
	});

	describe('persistence', () => {
		it('should use default false when no stored value', () => {
			spyStorageGet.mockReturnValueOnce(undefined);
			const store = authLocked;

			let currentValue: AuthLockStoreData | undefined;
			const unsubscribe = store.subscribe((v) => (currentValue = v));
			unsubscribe();

			expect(currentValue).toBeFalsy();
		});
	});
});
