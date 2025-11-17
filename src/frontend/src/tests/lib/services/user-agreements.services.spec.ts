import { agreementsData } from '$env/agreements.env';
import { nowInBigIntNanoSeconds } from '$icp/utils/date.utils';
import { updateUserAgreements } from '$lib/api/backend.api';
import { acceptAgreements } from '$lib/services/user-agreements.services';
import { i18n } from '$lib/stores/i18n.store';
import * as toastsStore from '$lib/stores/toasts.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { AgreementsToAccept } from '$lib/types/user-agreements';
import * as eventsUtils from '$lib/utils/events.utils';
import { emit } from '$lib/utils/events.utils';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { get } from 'svelte/store';

vi.mock('$lib/api/backend.api', () => ({
	updateUserAgreements: vi.fn()
}));

vi.mock('$icp/utils/date.utils', () => ({
	nowInBigIntNanoSeconds: vi.fn().mockReturnValue(123_456_789n)
}));

describe('user-agreements.services', () => {
	describe('acceptAgreements', () => {
		const mockedNow = 123_456_789n;

		const mockAgreementsToAccept: AgreementsToAccept = {
			licenseAgreement: true,
			privacyPolicy: false,
			termsOfUse: true
		};

		const mockUserVersion = 123n;

		const params = {
			identity: mockIdentity,
			agreementsToAccept: mockAgreementsToAccept,
			currentUserVersion: mockUserVersion
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.spyOn(toastsStore, 'toastsError');

			vi.spyOn(eventsUtils, 'emit');
		});

		it('should return early if the user is not authenticated', async () => {
			await acceptAgreements({ ...params, identity: null });

			expect(nowInBigIntNanoSeconds).not.toHaveBeenCalled();

			expect(updateUserAgreements).not.toHaveBeenCalled();

			expect(emit).not.toHaveBeenCalled();
		});

		it('should update the user agreements', async () => {
			await acceptAgreements(params);

			expect(nowInBigIntNanoSeconds).toHaveBeenCalledTimes(2);

			expect(updateUserAgreements).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				agreements: {
					licenseAgreement: {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp,
						textSha256: agreementsData.licenseAgreement.textSha256
					},
					termsOfUse: {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: agreementsData.termsOfUse.lastUpdatedTimestamp,
						textSha256: agreementsData.termsOfUse.textSha256
					}
				},
				currentUserVersion: mockUserVersion
			});
		});

		it('should emit the `oisyRefreshUserProfile` event', async () => {
			await acceptAgreements(params);

			expect(emit).toHaveBeenCalledExactlyOnceWith({
				message: 'oisyRefreshUserProfile'
			});
		});

		it('should handle errors if the user agreements update fails', async () => {
			const mockError = new Error('Failed to update');

			vi.mocked(updateUserAgreements).mockRejectedValueOnce(mockError);

			await acceptAgreements(params);

			expect(toastsError).toHaveBeenCalledExactlyOnceWith({
				msg: { text: get(i18n).agreements.error.cannot_update_user_agreements },
				err: mockError
			});

			expect(emit).not.toHaveBeenCalled();
		});

		it('should handle empty agreements to accept', async () => {
			await acceptAgreements({ ...params, agreementsToAccept: {} });

			expect(nowInBigIntNanoSeconds).not.toHaveBeenCalled();

			expect(updateUserAgreements).not.toHaveBeenCalled();

			expect(emit).not.toHaveBeenCalled();
		});

		it('should handle agreements if they are all accepted', async () => {
			await acceptAgreements({
				...params,
				agreementsToAccept: {
					licenseAgreement: true,
					privacyPolicy: true,
					termsOfUse: true
				}
			});

			expect(nowInBigIntNanoSeconds).toHaveBeenCalledTimes(3);

			expect(updateUserAgreements).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				agreements: {
					licenseAgreement: {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp,
						textSha256: agreementsData.licenseAgreement.textSha256
					},
					privacyPolicy: {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: agreementsData.privacyPolicy.lastUpdatedTimestamp,
						textSha256: agreementsData.privacyPolicy.textSha256
					},
					termsOfUse: {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: agreementsData.termsOfUse.lastUpdatedTimestamp,
						textSha256: agreementsData.termsOfUse.textSha256
					}
				},
				currentUserVersion: mockUserVersion
			});
		});

		it('should handle agreements if they are all rejected', async () => {
			await acceptAgreements({
				...params,
				agreementsToAccept: {
					licenseAgreement: false,
					privacyPolicy: false,
					termsOfUse: false
				}
			});

			expect(nowInBigIntNanoSeconds).not.toHaveBeenCalled();

			expect(updateUserAgreements).not.toHaveBeenCalled();
		});

		it('should handle agreements if some are missing', async () => {
			await acceptAgreements({
				...params,
				agreementsToAccept: {
					licenseAgreement: true,
					privacyPolicy: false
				}
			});

			expect(nowInBigIntNanoSeconds).toHaveBeenCalledOnce();

			expect(updateUserAgreements).toHaveBeenCalledExactlyOnceWith({
				identity: mockIdentity,
				agreements: {
					licenseAgreement: {
						accepted: true,
						lastAcceptedTimestamp: mockedNow,
						lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp,
						textSha256: agreementsData.licenseAgreement.textSha256
					}
				},
				currentUserVersion: mockUserVersion
			});
		});
	});
});
