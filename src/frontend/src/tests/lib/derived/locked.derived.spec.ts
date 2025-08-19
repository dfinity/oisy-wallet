import { isAuthLocked, isLocked } from '$lib/derived/locked.derived';
import { authLocked } from '$lib/stores/locked.store';
import { mockAuthSignedIn, mockAuthStore } from '$tests/mocks/auth.mock';
import { Ed25519KeyIdentity } from '@dfinity/identity';
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
	});
});
