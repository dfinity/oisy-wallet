import { walletConnectPaired } from '$eth/stores/wallet-connect.store';
import { signOut } from '$lib/services/auth.services';
import { authStore } from '$lib/stores/auth.store';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import { delMultiKeysByPrincipal } from '$lib/utils/idb.utils';
import * as timeUtils from '$lib/utils/time.utils';
import { randomWait } from '$lib/utils/time.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';

vi.mock('$lib/utils/idb.utils', () => ({
	delMultiKeysByPrincipal: vi.fn()
}));

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
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
	describe('signOut', () => {
		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(eventsUtils, 'emit');

			vi.spyOn(timeUtils, 'randomWait').mockImplementation(vi.fn());
		});

		it('should call the signOut function of the authStore without resetting the url', async () => {
			const signOutSpy = vi.spyOn(authStore, 'signOut');

			mockLocation(activityLocation);

			await signOut({});

			expect(signOutSpy).toHaveBeenCalled();
			expect(window.location.href).toEqual(activityLocation);
		});

		it('should call the signOut function of the authStore and resetting the url', async () => {
			const signOutSpy = vi.spyOn(authStore, 'signOut');

			vi.mock('$lib/utils/nav.utils', () => ({
				gotoReplaceRoot: () => mockLocation(rootLocation)
			}));

			mockLocation(activityLocation);

			expect(window.location.href).toEqual(activityLocation);

			await signOut({ resetUrl: true });

			expect(signOutSpy).toHaveBeenCalled();
			expect(window.location.href).toEqual(rootLocation);
		});

		it('should call the signOut function of the authStore and clear the session storage', async () => {
			const signOutSpy = vi.spyOn(authStore, 'signOut');

			sessionStorage.setItem('key', 'value');

			expect(sessionStorage.getItem('key')).toEqual('value');

			await signOut({});

			expect(signOutSpy).toHaveBeenCalled();
			expect(sessionStorage.getItem('key')).toBeNull();
		});

		it('should clean the IDB storage for the current principal', async () => {
			vi.spyOn(authStore, 'subscribe').mockImplementation((fn) => {
				fn({ identity: mockIdentity });
				return () => {};
			});

			await signOut({});

			// 3 addresses + 1(+1) tokens
			expect(idbKeyval.del).toHaveBeenCalledTimes(5);

			// 4 transactions + 1 balances
			expect(delMultiKeysByPrincipal).toHaveBeenCalledTimes(5);
		});

		it('should clean the IDB storage for all principals', async () => {
			await signOut({ clearAllPrincipalsStorages: true });

			// 3 addresses + 1(+1) tokens + 4 txs + 1 balance
			expect(idbKeyval.clear).toHaveBeenCalledTimes(10);
		});

		it("should disconnect WalletConnect's session", async () => {
			const signOutSpy = vi.spyOn(authStore, 'signOut');

			await signOut({});

			expect(emit).toHaveBeenCalledExactlyOnceWith({ message: 'oisyDisconnectWalletConnect' });

			expect(signOutSpy).toHaveBeenCalled();
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
	});
});
