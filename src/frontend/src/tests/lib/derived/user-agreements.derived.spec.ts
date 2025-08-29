import { userAgreements } from '$lib/derived/user-agreements.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-agreements.derived', () => {
	const certified = false;

	describe('userAgreements', () => {
		const nullishAgreement: AgreementData = {
			accepted: undefined,
			lastAcceptedTimestamp: undefined,
			lastUpdatedTimestamp: undefined
		};
		const expectedNullishAgreements: UserAgreements = {
			licenseAgreement: nullishAgreement,
			privacyPolicy: nullishAgreement,
			termsOfUse: nullishAgreement
		};

		it('should return undefined data when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userAgreements)).toEqual(expectedNullishAgreements);
		});

		it('should return undefined data when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(userAgreements)).toEqual(expectedNullishAgreements);
		});

		it('should return the user agreements data if they are set', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n)
							}
						}
					})
				}
			});

			expect(get(userAgreements)).toEqual({
				licenseAgreement: {
					accepted: undefined,
					lastAcceptedTimestamp: undefined,
					lastUpdatedTimestamp: undefined
				},
				privacyPolicy: {
					accepted: false,
					lastAcceptedTimestamp: 1677628800n,
					lastUpdatedTimestamp: 1677542400n
				},
				termsOfUse: {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: 1677542401n
				}
			});
		});
	});
});
