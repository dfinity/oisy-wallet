import * as agreementsEnv from '$env/agreements.env';
import { agreementsData } from '$env/agreements.env';
import {
	hasOutdatedAgreements,
	noAgreementVisionedYet,
	userAgreements
} from '$lib/derived/user-agreements.derived';
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

	describe('noAgreementVisionedYet', () => {
		it('should return true when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(noAgreementVisionedYet)).toBeTruthy();
		});

		it('should return true when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(noAgreementVisionedYet)).toBeTruthy();
		});

		it('should return true if all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(noAgreementVisionedYet)).toBeTruthy();
		});

		it('should return false if there is at least one agreement accepted', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n)
							}
						}
					})
				}
			});

			expect(get(noAgreementVisionedYet)).toBeFalsy();
		});

		it('should return false if there is at least one agreement rejected', () => {
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
							}
						}
					})
				}
			});

			expect(get(noAgreementVisionedYet)).toBeFalsy();
		});

		it('should return false if all agreements are accepted', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							license_agreement: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(1677542402n)
							},
							privacy_policy: {
								accepted: toNullable(true),
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

			expect(get(noAgreementVisionedYet)).toBeFalsy();
		});

		it('should return false if all agreements are rejected', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							license_agreement: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(1677542402n)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n)
							}
						}
					})
				}
			});

			expect(get(noAgreementVisionedYet)).toBeFalsy();
		});

		it('should return false if some agreements are nullish, some accepted and some rejected', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							license_agreement: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(1677542402n)
							},
							privacy_policy: {
								accepted: toNullable(),
								last_accepted_at_ns: toNullable(),
								last_updated_at_ms: toNullable()
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

			expect(get(noAgreementVisionedYet)).toBeFalsy();
		});
	});

	describe('hasOutdatedAgreements', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should return true when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return true when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return true when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return true if there is at least one agreement that was not visioned yet', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return true if there is at least one agreement that was rejected', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							license_agreement: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(agreementsData.licenseAgreement.lastUpdatedTimestamp)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return true if there is at least one agreement that is outdated', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							license_agreement: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp - 1n
								)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return false if all agreements are accepted and up-to-date', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							license_agreement: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(agreementsData.licenseAgreement.lastUpdatedTimestamp)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(hasOutdatedAgreements)).toBeFalsy();
		});

		it('should return true if some agreements are nullish, some accepted and some rejected', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							license_agreement: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(1677542402n)
							},
							privacy_policy: {
								accepted: toNullable(),
								last_accepted_at_ns: toNullable(),
								last_updated_at_ms: toNullable()
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

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should return true if all agreements are rejected', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							license_agreement: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(1677542402n)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n)
							}
						}
					})
				}
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});

		it('should handle a new agreement that is not in the user profile', () => {
			const oldAgreementsData = { ...agreementsData };

			vi.spyOn(agreementsEnv, 'agreementsData', 'get').mockImplementation(() => ({
				...oldAgreementsData,
				newAgreement: {
					lastUpdatedDate: '2025-08-27T06:15Z',
					lastUpdatedTimestamp: {
						__bigint__: '1756245600000'
					}
				}
			}));

			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							license_agreement: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628802n),
								last_updated_at_ms: toNullable(agreementsData.licenseAgreement.lastUpdatedTimestamp)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(hasOutdatedAgreements)).toBeTruthy();
		});
	});

	describe('hasAcceptedAllLatestAgreements', () => {});
});
