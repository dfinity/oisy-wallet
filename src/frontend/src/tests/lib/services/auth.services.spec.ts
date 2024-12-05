import { signOut } from '$lib/services/auth.services';
import { authStore } from '$lib/stores/auth.store';
import { vi } from 'vitest';

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
	});
});
