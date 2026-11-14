import type { DismissedNotification } from '$declarations/backend/backend.did';
import {
	NOTIFICATION_QUALIFIER_MAX_BYTES,
	NOTIFICATION_VERSIONS
} from '$lib/constants/notification.constants';
import {
	filterUndismissedNotificationQualifiers,
	isSimpleNotificationDismissed,
	toNotificationQualifier
} from '$lib/utils/notification.utils';

describe('notification.utils', () => {
	const simple = ({
		kind,
		version = NOTIFICATION_VERSIONS[kind]
	}: {
		kind: 'BtcActivityInfo';
		version?: number;
	}): DismissedNotification => ({
		Simple: { kind: { [kind]: null } as { BtcActivityInfo: null }, version }
	});

	const qualified = ({
		kind,
		qualifier,
		version = NOTIFICATION_VERSIONS[kind]
	}: {
		kind: 'NoIndexCanister';
		qualifier: string;
		version?: number;
	}): DismissedNotification => ({
		Qualified: {
			kind: { [kind]: null } as { NoIndexCanister: null },
			qualifier,
			version
		}
	});

	const byteLength = (value: string): number => new TextEncoder().encode(value).length;

	describe('toNotificationQualifier', () => {
		it('should keep a qualifier within the limit', () => {
			const atLimit = 'a'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES);

			expect(toNotificationQualifier('ICP')).toBe('ICP');
			expect(toNotificationQualifier(atLimit)).toBe(atLimit);
		});

		it('should cut a longer qualifier to the limit', () => {
			const qualifier = 'a'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES + 10);

			expect(toNotificationQualifier(qualifier)).toBe('a'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES));
		});

		it('should count bytes and not split a character', () => {
			// 'é' takes two bytes, so after the leading 'a' the last 'é' would end one byte over.
			const qualifier = `a${'é'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES / 2)}`;

			const cut = toNotificationQualifier(qualifier);

			expect(cut).toBe(`a${'é'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES / 2 - 1)}`);
			expect(byteLength(cut)).toBe(NOTIFICATION_QUALIFIER_MAX_BYTES - 1);
		});

		it('should keep a character outside the basic plane whole', () => {
			// The emoji takes four bytes in UTF-8 and two code units in JavaScript.
			const qualifier = `${'a'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES - 2)}🙂`;

			expect(toNotificationQualifier(qualifier)).toBe(
				'a'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES - 2)
			);
		});

		it('should return an empty qualifier as it is', () => {
			expect(toNotificationQualifier('')).toBe('');
		});
	});

	describe('isSimpleNotificationDismissed', () => {
		it('should return true when the kind is in the list with current version', () => {
			const dismissed: DismissedNotification[] = [
				simple({ kind: 'BtcActivityInfo' }),
				qualified({ kind: 'NoIndexCanister', qualifier: 'ETH' })
			];

			expect(
				isSimpleNotificationDismissed({
					kind: 'BtcActivityInfo',
					dismissedNotifications: dismissed
				})
			).toBeTruthy();
		});

		it('should return false when the kind has an old version', () => {
			const dismissed: DismissedNotification[] = [simple({ kind: 'BtcActivityInfo', version: 0 })];

			expect(
				isSimpleNotificationDismissed({
					kind: 'BtcActivityInfo',
					dismissedNotifications: dismissed
				})
			).toBeFalsy();
		});

		it('should return false when the kind is not in the list', () => {
			const dismissed: DismissedNotification[] = [
				qualified({ kind: 'NoIndexCanister', qualifier: 'ETH' })
			];

			expect(
				isSimpleNotificationDismissed({
					kind: 'BtcActivityInfo',
					dismissedNotifications: dismissed
				})
			).toBeFalsy();
		});

		it('should return false for empty list', () => {
			expect(
				isSimpleNotificationDismissed({ kind: 'BtcActivityInfo', dismissedNotifications: [] })
			).toBeFalsy();
		});
	});

	describe('filterUndismissedNotificationQualifiers', () => {
		describe('NoIndexCanister kind', () => {
			it('should return all qualifiers when none are dismissed', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: ['BTC', 'ETH', 'ICP'],
					dismissedNotifications: []
				});

				expect(result).toEqual(['BTC', 'ETH', 'ICP']);
			});

			it('should filter out dismissed qualifiers', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: ['BTC', 'ETH', 'ICP'],
					dismissedNotifications: [
						qualified({ kind: 'NoIndexCanister', qualifier: 'BTC' }),
						qualified({ kind: 'NoIndexCanister', qualifier: 'ICP' })
					]
				});

				expect(result).toEqual(['ETH']);
			});

			it('should return empty array when all qualifiers are dismissed', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: ['BTC', 'ETH'],
					dismissedNotifications: [
						qualified({ kind: 'NoIndexCanister', qualifier: 'BTC' }),
						qualified({ kind: 'NoIndexCanister', qualifier: 'ETH' })
					]
				});

				expect(result).toEqual([]);
			});

			it('should not filter qualifiers dismissed under a different kind', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: ['BTC', 'ETH'],
					dismissedNotifications: [simple({ kind: 'BtcActivityInfo' })]
				});

				expect(result).toEqual(['BTC', 'ETH']);
			});

			it('should filter out a long qualifier dismissed with its cut form', () => {
				const long = 'L'.repeat(NOTIFICATION_QUALIFIER_MAX_BYTES + 10);

				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: [long, 'ETH'],
					dismissedNotifications: [
						qualified({ kind: 'NoIndexCanister', qualifier: toNotificationQualifier(long) })
					]
				});

				expect(result).toEqual(['ETH']);
			});

			it('should not filter qualifiers dismissed with an old version', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: ['BTC'],
					dismissedNotifications: [
						qualified({ kind: 'NoIndexCanister', qualifier: 'BTC', version: 0 })
					]
				});

				expect(result).toEqual(['BTC']);
			});
		});

		it('should return empty array when qualifiers is empty', () => {
			const result = filterUndismissedNotificationQualifiers({
				kind: 'NoIndexCanister',
				qualifiers: [],
				dismissedNotifications: [qualified({ kind: 'NoIndexCanister', qualifier: 'BTC' })]
			});

			expect(result).toEqual([]);
		});
	});
});
