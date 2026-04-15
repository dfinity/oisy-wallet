import type { DismissedNotification } from '$declarations/backend/backend.did';
import { addUserDismissedNotification } from '$lib/api/backend.api';
import type { NullishIdentity } from '$lib/types/identity';
import { emit } from '$lib/utils/events.utils';
import { isNullish } from '@dfinity/utils';

export const dismissNotifications = async ({
	notifications,
	identity,
	currentUserVersion
}: {
	notifications: DismissedNotification[];
	identity: NullishIdentity;
	currentUserVersion: bigint | undefined;
}): Promise<void> => {
	if (isNullish(identity) || notifications.length === 0) {
		return;
	}

	try {
		await addUserDismissedNotification({
			notifications,
			identity,
			currentUserVersion
		});

		emit({ message: 'oisyRefreshUserProfile' });
	} catch (_: unknown) {
		// We can ignore the issue created by this service since it is not disruptive of the user flow
	}
};
