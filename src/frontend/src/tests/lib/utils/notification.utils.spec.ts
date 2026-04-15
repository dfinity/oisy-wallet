import type { DismissedNotification } from '$declarations/backend/backend.did';
import { NOTIFICATION_VERSIONS } from '$lib/constants/notification.constants';
import {
	filterUndismissedNotificationQualifiers,
	isSimpleNotificationDismissed
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
		kind: 'NoIndexCanister' | 'UnavailableIndexCanister';
		qualifier: string;
		version?: number;
	}): DismissedNotification => ({
		Qualified: {
			kind: { [kind]: null } as { NoIndexCanister: null } | { UnavailableIndexCanister: null },
			qualifier,
			version
		}
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
					dismissedNotifications: [
						qualified({ kind: 'UnavailableIndexCanister', qualifier: 'BTC' }),
						simple({ kind: 'BtcActivityInfo' })
					]
				});

				expect(result).toEqual(['BTC', 'ETH']);
			});

			it('should not filter qualifiers dismissed with an old version', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'NoIndexCanister',
					qualifiers: ['BTC'],
					dismissedNotifications: [qualified({ kind: 'NoIndexCanister', qualifier: 'BTC', version: 0 })]
				});

				expect(result).toEqual(['BTC']);
			});
		});

		describe('UnavailableIndexCanister kind', () => {
			it('should filter dismissed UnavailableIndexCanister qualifiers', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'UnavailableIndexCanister',
					qualifiers: ['BTC', 'ETH', 'ICP'],
					dismissedNotifications: [qualified({ kind: 'UnavailableIndexCanister', qualifier: 'ETH' })]
				});

				expect(result).toEqual(['BTC', 'ICP']);
			});

			it('should not filter qualifiers dismissed under NoIndexCanister', () => {
				const result = filterUndismissedNotificationQualifiers({
					kind: 'UnavailableIndexCanister',
					qualifiers: ['BTC'],
					dismissedNotifications: [qualified({ kind: 'NoIndexCanister', qualifier: 'BTC' })]
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
