import type { DismissedNotification } from '$declarations/backend/backend.did';
import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';

type NotificationKind = keyof typeof NOTIFICATION_VERSIONS;

export const isSimpleNotificationDismissed = ({
	kind,
	dismissedNotifications
}: {
	kind: NotificationKind;
	dismissedNotifications: DismissedNotification[];
}): boolean =>
	dismissedNotifications.some(
		(n) =>
			'Simple' in n && kind in n.Simple.kind && n.Simple.version === NOTIFICATION_VERSIONS[kind]
	);

export const filterUndismissedNotificationQualifiers = ({
	kind,
	qualifiers,
	dismissedNotifications
}: {
	kind: NotificationKind;
	qualifiers: string[];
	dismissedNotifications: DismissedNotification[];
}): string[] =>
	qualifiers.filter(
		(qualifier) =>
			!dismissedNotifications.some(
				(n) =>
					'Qualified' in n &&
					kind in n.Qualified.kind &&
					n.Qualified.qualifier === qualifier &&
					n.Qualified.version === NOTIFICATION_VERSIONS[kind]
			)
	);
