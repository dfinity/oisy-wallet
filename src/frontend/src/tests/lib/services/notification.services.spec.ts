import type { DismissedNotification } from '$declarations/backend/backend.did';
import { addUserDismissedNotification } from '$lib/api/backend.api';
import { dismissNotifications } from '$lib/services/notification.services';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';

vi.mock('$lib/api/backend.api', () => ({
	addUserDismissedNotification: vi.fn()
}));

describe('notification.services', () => {
	describe('dismissNotifications', () => {
		const mockNotifications: DismissedNotification[] = [
			{
				Qualified: {
					kind: { NoIndexCanister: null },
					qualifier: 'BTC',
					version: 1
				}
			},
			{
				Qualified: {
					kind: { NoIndexCanister: null },
					qualifier: 'ETH',
					version: 1
				}
			}
		];
		const mockUserVersion = 5n;

		const params = {
			notifications: mockNotifications,
			identity: mockIdentity,
			currentUserVersion: mockUserVersion
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(eventsUtils, 'emit');
		});

		it('should return early if identity is nullish', async () => {
			await dismissNotifications({ ...params, identity: null });

			expect(addUserDismissedNotification).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalled();
		});

		it('should return early if identity is undefined', async () => {
			await dismissNotifications({ ...params, identity: undefined });

			expect(addUserDismissedNotification).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalled();
		});

		it('should return early if notifications is empty', async () => {
			await dismissNotifications({ ...params, notifications: [] });

			expect(addUserDismissedNotification).not.toHaveBeenCalled();
			expect(emit).not.toHaveBeenCalled();
		});

		it('should call addUserDismissedNotification with the correct params', async () => {
			await dismissNotifications(params);

			expect(addUserDismissedNotification).toHaveBeenCalledExactlyOnceWith({
				notifications: mockNotifications,
				identity: mockIdentity,
				currentUserVersion: mockUserVersion
			});
		});

		it('should emit oisyRefreshUserProfile event on success', async () => {
			await dismissNotifications(params);

			expect(emit).toHaveBeenCalledExactlyOnceWith({
				message: 'oisyRefreshUserProfile'
			});
		});

		it('should silently catch errors without emitting', async () => {
			vi.mocked(addUserDismissedNotification).mockRejectedValueOnce(new Error('API failure'));

			await dismissNotifications(params);

			expect(emit).not.toHaveBeenCalled();
		});
	});
});
