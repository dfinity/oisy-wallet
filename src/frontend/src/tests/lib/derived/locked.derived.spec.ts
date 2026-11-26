import { authLockReason, isAuthLocked, isLocked } from '$lib/derived/locked.derived';
import { authLocked } from '$lib/stores/locked.store';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
import { get } from 'svelte/store';

describe('auth.derived', () => {
	describe('isLocked', () => {
		it('should return the current locked state', () => {
			// Initial state should be false
			expect(get(isLocked)).toBeFalsy();

			// Test locked state
			authLocked.toggleLock({});

			expect(get(isLocked)).toBeTruthy();

			// Test unlocked state
			authLocked.toggleLock({});

			expect(get(isLocked)).toBeFalsy();
		});
	});

	describe('authLockReason', () => {
		afterEach(() => {
			authLocked.set({ key: 'authLocked', value: false });
		});

		it('should be undefined when unlocked', () => {
			authLocked.set({ key: 'authLocked', value: false });

			expect(get(authLockReason)).toBeUndefined();
		});

		it('should read a lock stored before the reason as a lock', () => {
			authLocked.set({ key: 'authLocked', value: true });

			expect(get(authLockReason)).toBe('lock');
		});

		it.each(['lock', 'expired'] as const)('should return the stored reason %s', (reason) => {
			authLocked.set({ key: 'authLocked', value: reason });

			expect(get(authLockReason)).toBe(reason);
			expect(get(isLocked)).toBeTruthy();
		});
	});

	describe('isAuthLocked', () => {
		const mockIdentity = Ed25519KeyIdentity.generate();

		beforeEach(() => {
			authLocked.set({ key: 'authLocked', value: false });
			mockAuthStore(mockIdentity);
			mockAuthSignedIn(true);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should return true only when both not signed in and locked', () => {
			expect(get(isAuthLocked)).toBeFalsy();

			// Only locked
			authLocked.set({ key: 'authLocked', value: true });

			// Only not signed in
			mockAuthStore(null);
			mockAuthSignedIn(false);
			authLocked.set({ key: 'authLocked', value: false });

			expect(get(isAuthLocked)).toBeFalsy();

			// Both conditions true
			authLocked.set({ key: 'authLocked', value: true });

			expect(get(isAuthLocked)).toBeTruthy();
		});

		it('should react to changes in both stores', () => {
			expect(get(isAuthLocked)).toBeFalsy();

			mockAuthStore(null);
			mockAuthSignedIn(false);

			expect(get(isAuthLocked)).toBeFalsy();

			authLocked.set({ key: 'authLocked', value: true });

			expect(get(isAuthLocked)).toBeTruthy();
		});

		it('should be true when not signed in after the session expired', () => {
			mockAuthStore(null);
			mockAuthSignedIn(false);

			authLocked.set({ key: 'authLocked', value: 'expired' });

			expect(get(isAuthLocked)).toBeTruthy();
		});
	});
});
