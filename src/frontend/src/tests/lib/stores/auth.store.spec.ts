import * as constants from '$lib/constants/app.constants';
import { AuthClientProvider } from '$lib/providers/auth-client.providers';
import { authStore } from '$lib/stores/auth.store';
import { InternetIdentityDomain } from '$lib/types/auth';
import * as deviceUtils from '$lib/utils/device.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import type { AuthClient } from '@icp-sdk/auth/client';
import { Ed25519KeyIdentity } from '@icp-sdk/core/identity';
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

	describe('signIn', () => {
		const provider = AuthClientProvider.getInstance();

		const mockSignerWindow = (closed = false) =>
			({
				closed,
				close: vi.fn(),
				focus: vi.fn(),
				postMessage: vi.fn()
			}) as unknown as Window;

		const buildClient = (signInImpl: () => Promise<unknown>) =>
			({
				signIn: vi.fn(signInImpl),
				// Returning `true` keeps `pickAuthClient` from falling through to
				// `safeCreateAuthClient`, which would otherwise need to be mocked
				// as well.
				isAuthenticated: vi.fn(() => true),
				logout: vi.fn(() => Promise.resolve()),
				getIdentity: vi.fn(() => Promise.resolve(mockIdentity))
			}) as unknown as AuthClient;

		beforeEach(() => {
			vi.useFakeTimers();
			vi.clearAllMocks();

			// Initialize the cached `authClient` in the store so `signIn()`
			// doesn't throw `AuthClientNotInitializedError` before reaching the
			// code path under test.
			vi.spyOn(provider, 'createAuthClient').mockResolvedValue(
				buildClient(() => Promise.resolve(mockIdentity))
			);
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should pre-open the signer window with the SDK-compatible name so the SDK reuses it', async () => {
			await authStore.sync();

			const signerWindow = mockSignerWindow();
			const openSpy = vi.spyOn(window, 'open').mockReturnValue(signerWindow);

			vi.spyOn(provider, 'createAuthClientForSignIn').mockReturnValue(
				buildClient(() => Promise.resolve(mockIdentity))
			);

			await authStore.signIn({ domain: InternetIdentityDomain.VERSION_2_0 });

			// Window name follows `<origin>-signer-window`, the convention
			// `PostMessageTransport` uses internally so it reuses our window.
			expect(openSpy).toHaveBeenCalledExactlyOnceWith(
				'',
				expect.stringMatching(/^https?:\/\/[^/]+-signer-window$/),
				undefined
			);
			expect(get(authStore).identity).toBe(mockIdentity);
		});

		it('should reject with "UserInterrupt" when the signer window is closed before sign-in resolves', async () => {
			await authStore.sync();

			const signerWindow = mockSignerWindow();
			vi.spyOn(window, 'open').mockReturnValue(signerWindow);

			// `client.signIn(...)` would normally be settled by the SDK's
			// heartbeat. Here it stays pending so the user-interrupt poller is
			// the only thing that can settle the race.
			vi.spyOn(provider, 'createAuthClientForSignIn').mockReturnValue(
				buildClient(() => new Promise(() => undefined))
			);

			let caught: unknown;
			const settled = authStore.signIn({ domain: InternetIdentityDomain.VERSION_2_0 }).then(
				() => {
					caught = 'resolved';
				},
				(err: unknown) => {
					caught = err;
				}
			);

			(signerWindow as unknown as { closed: boolean }).closed = true;

			await vi.advanceTimersByTimeAsync(1000);
			await settled;

			expect(caught).toBe('UserInterrupt');
		});

		describe('window opener features', () => {
			const signInAndGetFeatures = async (): Promise<string | undefined> => {
				await authStore.sync();

				const openSpy = vi.spyOn(window, 'open').mockReturnValue(mockSignerWindow());

				vi.spyOn(provider, 'createAuthClientForSignIn').mockReturnValue(
					buildClient(() => Promise.resolve(mockIdentity))
				);

				await authStore.signIn({ domain: InternetIdentityDomain.VERSION_2_0 });

				return openSpy.mock.calls[0]?.[2];
			};

			it('should open a popup in a desktop PWA', async () => {
				vi.spyOn(deviceUtils, 'isDesktop').mockReturnValue(true);
				vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(true);

				await expect(signInAndGetFeatures()).resolves.toContain('width=');
			});

			it('should open a new tab in a desktop browser tab', async () => {
				vi.spyOn(deviceUtils, 'isDesktop').mockReturnValue(true);
				vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(false);

				await expect(signInAndGetFeatures()).resolves.toBeUndefined();
			});

			it('should open a new tab in a mobile PWA', async () => {
				vi.spyOn(deviceUtils, 'isDesktop').mockReturnValue(false);
				vi.spyOn(deviceUtils, 'isPWAStandalone').mockReturnValue(true);

				await expect(signInAndGetFeatures()).resolves.toBeUndefined();
			});
		});

		it('should not poll when the popup was blocked (window.open returns null)', async () => {
			await authStore.sync();

			vi.spyOn(window, 'open').mockReturnValue(null);

			vi.spyOn(provider, 'createAuthClientForSignIn').mockReturnValue(
				buildClient(() => Promise.resolve(mockIdentity))
			);

			await authStore.signIn({ domain: InternetIdentityDomain.VERSION_2_0 });

			expect(get(authStore).identity).toBe(mockIdentity);
		});
	});
});
