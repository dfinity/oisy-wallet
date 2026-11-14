import type { DismissedNotification } from '$declarations/backend/backend.did';
import {
	NOTIFICATION_QUALIFIER_MAX_BYTES,
	NOTIFICATION_VERSIONS
} from '$lib/constants/notification.constants';

type NotificationKind = keyof typeof NOTIFICATION_VERSIONS;

const encoder = new TextEncoder();

/**
 * The qualifier a notification is dismissed with: the given one, cut to the length the backend
 * stores, without splitting a character. Saving and checking a dismissal both go through it, so a
 * longer qualifier still matches its own dismissal.
 */
export const toNotificationQualifier = (qualifier: string): string => {
	let bytes = 0;
	let cut = '';

	for (const character of qualifier) {
		bytes += encoder.encode(character).length;

		if (bytes > NOTIFICATION_QUALIFIER_MAX_BYTES) {
			break;
		}

		cut += character;
	}

	return cut;
};

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
					n.Qualified.qualifier === toNotificationQualifier(qualifier) &&
					n.Qualified.version === NOTIFICATION_VERSIONS[kind]
			)
	);
