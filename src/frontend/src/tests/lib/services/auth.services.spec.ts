import { signOut } from '$lib/services/auth.services';
import { authStore } from '$lib/stores/auth.store';
import { delMultiKeysByPrincipal } from '$lib/utils/idb.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import * as idbKeyval from 'idb-keyval';

vi.mock('$lib/utils/idb.utils', () => ({
	delMultiKeysByPrincipal: vi.fn()
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

			// 3 addresses + 3(+1) tokens
			expect(idbKeyval.del).toHaveBeenCalledTimes(7);

			// 4 transactions + 1 balances
			expect(delMultiKeysByPrincipal).toHaveBeenCalledTimes(5);
		});

		it('should clean the IDB storage for all principals', async () => {
			await signOut({ clearAllPrincipalsStorages: true });

			// 3 addresses + 3(+1) tokens + 4 txs + 1 balance
			expect(idbKeyval.clear).toHaveBeenCalledTimes(12);
		});
	});
});
