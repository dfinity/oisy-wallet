import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
import {
	TRACK_SIGN_OUT_ERROR,
	TRACK_SIGN_OUT_SUCCESS,
	TRACK_SIGN_OUT_WITH_WARNING
} from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';
import {
	errorSignOut,
	idleSignOut,
	lockSession,
	nullishSignOut,
	signOut,
	warnSignOut
} from '$lib/services/auth.services';
import { authStore } from '$lib/stores/auth.store';
import { AUTH_LOCK_KEY } from '$lib/stores/locked.store';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import { delMultiKeysByPrincipal } from '$lib/utils/idb.utils';
import * as timeUtils from '$lib/utils/time.utils';
import { randomWait } from '$lib/utils/time.utils';
import en from '$tests/mocks/i18n.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';
import type { MockInstance } from 'vitest';

vi.mock('$lib/utils/idb.utils', () => ({
	delMultiKeysByPrincipal: vi.fn()
}));

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

vi.mock('$lib/services/analytics.services', () => ({
	trackEvent: vi.fn()
}));

const rootLocation = 'https://oisy.com/';
const activityLocation = 'https://oisy.com/activity';

const mockLocation = (url: string) => {
	Object.defineProperty(window, 'location', {
		writable: true,
		value: {
			href: url,
			reload: vi.fn()
		}
	});
};

describe('auth.services', () => {
	let signOutSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();

		signOutSpy = vi.spyOn(authStore, 'signOut');

		vi.spyOn(eventsUtils, 'emit');

		vi.spyOn(timeUtils, 'randomWait').mockImplementation(vi.fn());

		vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

		mockLocation(rootLocation);

		localStorage.clear();
	});

	describe.todo('signIn', () => {});

	describe('signOut', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the signOut function of the authStore without resetting the url', async () => {
			mockLocation(activityLocation);

			await signOut({});

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(activityLocation);
		});

		it('should call the signOut function of the authStore and resetting the url', async () => {
			vi.mock('$lib/utils/nav.utils', () => ({
				gotoReplaceRoot: () => mockLocation(rootLocation)
			}));

			mockLocation(activityLocation);

			expect(window.location.href).toEqual(activityLocation);

			await signOut({ resetUrl: true });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(rootLocation);
		});

		it('should call the signOut function of the authStore and clear the session storage', async () => {
			sessionStorage.setItem('key', 'value');

			expect(sessionStorage.getItem('key')).toEqual('value');

			await signOut({});

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(sessionStorage.getItem('key')).toBeNull();
		});

		it('should clean the IDB storage for the current principal', async () => {
			vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
				fn({ identity: mockIdentity });
				return () => {};
			});

			await signOut({});

			// 6 addresses (mainnet and testnet) + 1(+1) tokens
			expect(idbKeyval.del).toHaveBeenCalledTimes(8);

			// 4 transactions + 1 balances
			expect(delMultiKeysByPrincipal).toHaveBeenCalledTimes(5);
		});

		it('should clean the IDB storage for all principals', async () => {
			await signOut({ clearAllPrincipalsStorages: true });

			// 6 addresses (mainnet and testnet) + 1(+1) tokens + 4 txs + 1 balance
			expect(idbKeyval.clear).toHaveBeenCalledTimes(13);
		});

		it("should disconnect WalletConnect's session", async () => {
			await signOut({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
		});

		it("should wait for WalletConnect's session to be disconnected", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			let i = 0;
			vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
				i++;
				if (i >= maxSeconds / 2) {
					walletConnectPaired.set(false);
				}
				await Promise.resolve();
			});

			await signOut({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

			Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			await signOut({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

			Array.from({ length: maxSeconds }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it('should track the sign out event', async () => {
			await signOut({});

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_SIGN_OUT_SUCCESS,
				metadata: {
					reason: 'user',
					level: '',
					text: '',
					source: '',
					resetUrl: 'false',
					clearStorages: 'true'
				}
			});
		});

		it('should not append a message to the reload URL', async () => {
			await signOut({});

			expect(window.history.replaceState).not.toHaveBeenCalled();
		});
	});

	describe('errorSignOut', () => {
		const mockText = 'An error occurred';

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the signOut function of the authStore without resetting the url', async () => {
			mockLocation(activityLocation);

			expect(window.location.href).toEqual(activityLocation);

			await errorSignOut(mockText);

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(activityLocation);
		});

		it('should call the signOut function of the authStore and clear the session storage', async () => {
			sessionStorage.setItem('key', 'value');

			expect(sessionStorage.getItem('key')).toEqual('value');

			await errorSignOut(mockText);

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(sessionStorage.getItem('key')).toBeNull();
		});

		it('should clean the IDB storage for the current principal', async () => {
			vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
				fn({ identity: mockIdentity });
				return () => {};
			});

			await errorSignOut(mockText);

			// 6 addresses (mainnet and testnet) + 1(+1) tokens
			expect(idbKeyval.del).toHaveBeenCalledTimes(8);

			// 4 transactions + 1 balances
			expect(delMultiKeysByPrincipal).toHaveBeenCalledTimes(5);
		});

		it('should not clean the IDB storage for all principals', async () => {
			await errorSignOut(mockText);

			expect(idbKeyval.clear).not.toHaveBeenCalled();
		});

		it("should disconnect WalletConnect's session", async () => {
			await errorSignOut(mockText);

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
		});

		it("should wait for WalletConnect's session to be disconnected", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			let i = 0;
			vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
				i++;
				if (i >= maxSeconds / 2) {
					walletConnectPaired.set(false);
				}
				await Promise.resolve();
			});

			await errorSignOut(mockText);

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

			Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			await errorSignOut(mockText);

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

			Array.from({ length: maxSeconds }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it('should track the sign out event', async () => {
			await errorSignOut(mockText);

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_SIGN_OUT_ERROR,
				metadata: {
					reason: 'error',
					level: 'error',
					text: mockText,
					source: 'app',
					resetUrl: 'false',
					clearStorages: 'true'
				}
			});
		});

		it('should append a message to the reload URL', async () => {
			await errorSignOut(mockText);

			expect(window.history.replaceState).toHaveBeenCalledExactlyOnceWith(
				{},
				'',
				new URL(`${rootLocation}?msg=${encodeURI(encodeURI(mockText))}&level=error`)
			);
		});
	});

	describe('warnSignOut', () => {
		const mockText = 'A warning occurred';

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the signOut function of the authStore without resetting the url', async () => {
			mockLocation(activityLocation);

			expect(window.location.href).toEqual(activityLocation);

			await warnSignOut(mockText);

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(activityLocation);
		});

		it('should call the signOut function of the authStore and clear the session storage', async () => {
			sessionStorage.setItem('key', 'value');

			expect(sessionStorage.getItem('key')).toEqual('value');

			await warnSignOut(mockText);

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(sessionStorage.getItem('key')).toBeNull();
		});

		it('should clean the IDB storage for the current principal', async () => {
			vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
				fn({ identity: mockIdentity });
				return () => {};
			});

			await warnSignOut(mockText);

			// 6 addresses (mainnet and testnet) + 1(+1) tokens
			expect(idbKeyval.del).toHaveBeenCalledTimes(8);

			// 4 transactions + 1 balances
			expect(delMultiKeysByPrincipal).toHaveBeenCalledTimes(5);
		});

		it('should not clean the IDB storage for all principals', async () => {
			await warnSignOut(mockText);

			expect(idbKeyval.clear).not.toHaveBeenCalled();
		});

		it("should disconnect WalletConnect's session", async () => {
			await warnSignOut(mockText);

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
		});

		it("should wait for WalletConnect's session to be disconnected", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			let i = 0;
			vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
				i++;
				if (i >= maxSeconds / 2) {
					walletConnectPaired.set(false);
				}
				await Promise.resolve();
			});

			await warnSignOut(mockText);

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

			Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			await warnSignOut(mockText);

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

			Array.from({ length: maxSeconds }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it('should track the sign out event', async () => {
			await warnSignOut(mockText);

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_SIGN_OUT_WITH_WARNING,
				metadata: {
					reason: 'warning',
					level: 'warn',
					text: mockText,
					source: 'app',
					resetUrl: 'false',
					clearStorages: 'true'
				}
			});
		});

		it('should append a message to the reload URL', async () => {
			await warnSignOut(mockText);

			expect(window.history.replaceState).toHaveBeenCalledExactlyOnceWith(
				{},
				'',
				new URL(`${rootLocation}?msg=${encodeURI(encodeURI(mockText))}&level=warn`)
			);
		});
	});

	describe('nullishSignOut', () => {
		const expectedText = en.auth.warning.not_signed_in;

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the signOut function of the authStore without resetting the url', async () => {
			mockLocation(activityLocation);

			expect(window.location.href).toEqual(activityLocation);

			await nullishSignOut();

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(activityLocation);
		});

		it('should call the signOut function of the authStore and clear the session storage', async () => {
			sessionStorage.setItem('key', 'value');

			expect(sessionStorage.getItem('key')).toEqual('value');

			await nullishSignOut();

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(sessionStorage.getItem('key')).toBeNull();
		});

		it('should clean the IDB storage for the current principal', async () => {
			vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
				fn({ identity: mockIdentity });
				return () => {};
			});

			await nullishSignOut();

			// 6 addresses (mainnet and testnet) + 1(+1) tokens
			expect(idbKeyval.del).toHaveBeenCalledTimes(8);

			// 4 transactions + 1 balances
			expect(delMultiKeysByPrincipal).toHaveBeenCalledTimes(5);
		});

		it('should not clean the IDB storage for all principals', async () => {
			await nullishSignOut();

			expect(idbKeyval.clear).not.toHaveBeenCalled();
		});

		it("should disconnect WalletConnect's session", async () => {
			await nullishSignOut();

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
		});

		it("should wait for WalletConnect's session to be disconnected", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			let i = 0;
			vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
				i++;
				if (i >= maxSeconds / 2) {
					walletConnectPaired.set(false);
				}
				await Promise.resolve();
			});

			await nullishSignOut();

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

			Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			await nullishSignOut();

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

			Array.from({ length: maxSeconds }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it('should track the sign out event', async () => {
			await nullishSignOut();

			expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
				name: TRACK_SIGN_OUT_WITH_WARNING,
				metadata: {
					reason: 'warning',
					level: 'warn',
					text: expectedText,
					source: 'app',
					resetUrl: 'false',
					clearStorages: 'true'
				}
			});
		});

		it('should append a message to the reload URL', async () => {
			await nullishSignOut();

			expect(window.history.replaceState).toHaveBeenCalledExactlyOnceWith(
				{},
				'',
				new URL(`${rootLocation}?msg=${encodeURI(encodeURI(expectedText))}&level=warn`)
			);
		});
	});

	describe('idleSignOut', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		describe('when the session is not locked', () => {
			const expectedText = en.auth.warning.session_expired;

			beforeEach(() => {
				localStorage.setItem(AUTH_LOCK_KEY, 'false');
			});

			it('should call the signOut function of the authStore without resetting the url', async () => {
				mockLocation(activityLocation);

				expect(window.location.href).toEqual(activityLocation);

				await idleSignOut();

				expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
				expect(window.location.href).toEqual(activityLocation);
			});

			it('should call the signOut function of the authStore and clear the session storage', async () => {
				sessionStorage.setItem('key', 'value');

				expect(sessionStorage.getItem('key')).toEqual('value');

				await idleSignOut();

				expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
				expect(sessionStorage.getItem('key')).toBeNull();
			});

			it('should not clean the IDB storage for the current principal', async () => {
				vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
					fn({ identity: mockIdentity });
					return () => {};
				});

				await idleSignOut();

				expect(idbKeyval.del).not.toHaveBeenCalled();

				expect(delMultiKeysByPrincipal).not.toHaveBeenCalled();
			});

			it('should not clean the IDB storage for all principals', async () => {
				await idleSignOut();

				expect(idbKeyval.clear).not.toHaveBeenCalled();
			});

			it("should disconnect WalletConnect's session", async () => {
				await idleSignOut();

				expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

				expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			});

			it("should wait for WalletConnect's session to be disconnected", async () => {
				const maxSeconds = 10;

				walletConnectPaired.set(true);

				let i = 0;
				vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
					i++;
					if (i >= maxSeconds / 2) {
						walletConnectPaired.set(false);
					}
					await Promise.resolve();
				});

				await idleSignOut();

				expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

				expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

				Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
					expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
				});
			});

			it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
				const maxSeconds = 10;

				walletConnectPaired.set(true);

				await idleSignOut();

				expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

				expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

				Array.from({ length: maxSeconds }).forEach((_, i) => {
					expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
				});
			});

			it('should track the sign out event', async () => {
				await idleSignOut();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_SIGN_OUT_WITH_WARNING,
					metadata: {
						reason: 'session_expired',
						level: 'warn',
						text: expectedText,
						clearStorages: 'false'
					}
				});
			});

			it('should append a message to the reload URL', async () => {
				await idleSignOut();

				expect(window.history.replaceState).toHaveBeenCalledExactlyOnceWith(
					{},
					'',
					new URL(`${rootLocation}?msg=${encodeURI(encodeURI(expectedText))}&level=warn`)
				);
			});
		});

		describe('when the session is locked', () => {
			const expectedText = en.auth.message.session_locked;

			beforeEach(() => {
				localStorage.setItem(AUTH_LOCK_KEY, 'true');
			});

			it('should call the signOut function of the authStore without resetting the url', async () => {
				mockLocation(activityLocation);

				expect(window.location.href).toEqual(activityLocation);

				await idleSignOut();

				expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
				expect(window.location.href).toEqual(activityLocation);
			});

			it('should call the signOut function of the authStore and clear the session storage', async () => {
				sessionStorage.setItem('key', 'value');

				expect(sessionStorage.getItem('key')).toEqual('value');

				await idleSignOut();

				expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
				expect(sessionStorage.getItem('key')).toBeNull();
			});

			it('should clean the IDB storage for the current principal', async () => {
				vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
					fn({ identity: mockIdentity });
					return () => {};
				});

				await idleSignOut();

				expect(idbKeyval.del).not.toHaveBeenCalled();

				expect(delMultiKeysByPrincipal).not.toHaveBeenCalled();
			});

			it('should not clean the IDB storage for all principals', async () => {
				await idleSignOut();

				expect(idbKeyval.clear).not.toHaveBeenCalled();
			});

			it("should disconnect WalletConnect's session", async () => {
				await idleSignOut();

				expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

				expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			});

			it("should wait for WalletConnect's session to be disconnected", async () => {
				const maxSeconds = 10;

				walletConnectPaired.set(true);

				let i = 0;
				vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
					i++;
					if (i >= maxSeconds / 2) {
						walletConnectPaired.set(false);
					}
					await Promise.resolve();
				});

				await idleSignOut();

				expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

				expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

				Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
					expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
				});
			});

			it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
				const maxSeconds = 10;

				walletConnectPaired.set(true);

				await idleSignOut();

				expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

				expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

				Array.from({ length: maxSeconds }).forEach((_, i) => {
					expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
				});
			});

			it('should track the sign out event', async () => {
				await idleSignOut();

				expect(trackEvent).toHaveBeenCalledExactlyOnceWith({
					name: TRACK_SIGN_OUT_WITH_WARNING,
					metadata: {
						reason: 'session_locked',
						level: 'info',
						text: expectedText,
						clearStorages: 'false'
					}
				});
			});

			it('should append a message to the reload URL', async () => {
				await idleSignOut();

				expect(window.history.replaceState).toHaveBeenCalledExactlyOnceWith(
					{},
					'',
					new URL(`${rootLocation}?msg=${encodeURI(encodeURI(expectedText))}&level=info`)
				);
			});
		});
	});

	describe('lockSession', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the signOut function of the authStore without resetting the url', async () => {
			mockLocation(activityLocation);

			await lockSession({});

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(activityLocation);
		});

		it('should call the signOut function of the authStore and resetting the url', async () => {
			vi.mock('$lib/utils/nav.utils', () => ({
				gotoReplaceRoot: () => mockLocation(rootLocation)
			}));

			mockLocation(activityLocation);

			expect(window.location.href).toEqual(activityLocation);

			await lockSession({ resetUrl: true });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(window.location.href).toEqual(rootLocation);
		});

		it('should call the signOut function of the authStore and clear the session storage', async () => {
			sessionStorage.setItem('key', 'value');

			expect(sessionStorage.getItem('key')).toEqual('value');

			await lockSession({});

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
			expect(sessionStorage.getItem('key')).toBeNull();
		});

		it('should not clean the IDB storage for the current principal', async () => {
			vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
				fn({ identity: mockIdentity });
				return () => {};
			});

			await lockSession({});

			expect(idbKeyval.del).not.toHaveBeenCalled();

			expect(delMultiKeysByPrincipal).not.toHaveBeenCalled();
		});

		it('should not clean the IDB storage for all principals', async () => {
			await lockSession({});

			expect(idbKeyval.clear).not.toHaveBeenCalled();
		});

		it("should disconnect WalletConnect's session", async () => {
			await lockSession({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(signOutSpy).toHaveBeenCalledExactlyOnceWith();
		});

		it("should wait for WalletConnect's session to be disconnected", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			let i = 0;
			vi.spyOn(timeUtils, 'randomWait').mockImplementation(async () => {
				i++;
				if (i >= maxSeconds / 2) {
					walletConnectPaired.set(false);
				}
				await Promise.resolve();
			});

			await lockSession({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds / 2);

			Array.from({ length: maxSeconds / 2 }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it("should wait for WalletConnect's session to be disconnected for a maximum 10 seconds", async () => {
			const maxSeconds = 10;

			walletConnectPaired.set(true);

			await lockSession({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(randomWait).toHaveBeenCalledTimes(maxSeconds);

			Array.from({ length: maxSeconds }).forEach((_, i) => {
				expect(randomWait).toHaveBeenNthCalledWith(i + 1, { min: 1000, max: 1000 });
			});
		});

		it('should not track the sign out event', async () => {
			await lockSession({});

			expect(trackEvent).not.toHaveBeenCalled();
		});

		it('should not append a message to the reload URL', async () => {
			await lockSession({});

			expect(window.history.replaceState).not.toHaveBeenCalled();
		});
	});

	describe.todo('displayAndCleanLogoutMsg', () => {});
});
