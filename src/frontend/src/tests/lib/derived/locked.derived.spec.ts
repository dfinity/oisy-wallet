import { isAuthLocked, isLocked } from '$lib/derived/locked.derived';
import { authStore } from '$lib/stores/auth.store';
import { authLocked } from '$lib/stores/locked.store';
import { Ed25519KeyIdentity } from '@dfinity/identity';
import { get } from 'svelte/store';

describe('auth.derived', () => {
	describe('isLocked', () => {
		it('should return the current locked state', () => {
			// Initial state should be false
			expect(get(isLocked)).toBe(false);

			// Test locked state
			authLocked.toggleLock({});
			expect(get(isLocked)).toBe(true);

			// Test unlocked state
			authLocked.toggleLock({});
			expect(get(isLocked)).toBe(false);
		});
	});

	describe('isAuthLocked', () => {
		beforeEach(() => {
			authLocked.set({ key: 'authLocked', value: false });
			authStore.setForTesting(Ed25519KeyIdentity.generate());
		});

		it('should return true only when both not signed in and locked', () => {
			expect(get(isAuthLocked)).toBe(false);

			// Only locked
			authLocked.set({ key: 'authLocked', value: true });
			expect(get(isAuthLocked)).toBe(false);

			// Only not signed in
			authStore.setForTesting(null as any);
			authLocked.set({ key: 'authLocked', value: false });
			expect(get(isAuthLocked)).toBe(false);

			// Both conditions true
			authLocked.set({ key: 'authLocked', value: true });
			expect(get(isAuthLocked)).toBe(true);
		});

		it('should react to changes in both stores', () => {
			// Start with both false
			expect(get(isAuthLocked)).toBe(false);

			// Set not signed in
			authStore.setForTesting(null as any);
			expect(get(isAuthLocked)).toBe(false);

			// Then set locked
			authLocked.set({ key: 'authLocked', value: true });
			expect(get(isAuthLocked)).toBe(true);

			// Then sign in
			authStore.setForTesting(Ed25519KeyIdentity.generate());
			expect(get(isAuthLocked)).toBe(false);
		});
	});
});
