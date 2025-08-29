import * as agreementsEnv from '$env/agreements.env';
import { agreementsData } from '$env/agreements.env';
import {
	hasAcceptedAllLatestAgreements,
	hasOutdatedAgreements,
	noAgreementVisionedYet,
	outdatedAgreements,
	userAgreements
} from '$lib/derived/user-agreements.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-agreements.derived', () => {
	const certified = false;

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

	describe('userAgreements', () => {
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
				licenseAgreement: nullishAgreement,
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

	describe('outdatedAgreements', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();
		});

		it('should return all agreements when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(outdatedAgreements)).toEqual(expectedNullishAgreements);
		});

		it('should return all agreements when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(outdatedAgreements)).toEqual(expectedNullishAgreements);
		});

		it('should return all agreements when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(outdatedAgreements)).toEqual(expectedNullishAgreements);
		});

		it('should return the agreements that are not visioned yet', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						agreements: {
							...mockUserAgreements.agreements,
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toEqual({
				licenseAgreement: nullishAgreement,
				privacyPolicy: nullishAgreement
			});
		});

		it('should return agreements that were rejected', () => {
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
								accepted: toNullable(false),
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

			expect(get(outdatedAgreements)).toEqual({
				licenseAgreement: {
					accepted: false,
					lastAcceptedTimestamp: 1677628802n,
					lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp
				},
				privacyPolicy: {
					accepted: false,
					lastAcceptedTimestamp: 1677628800n,
					lastUpdatedTimestamp: agreementsData.privacyPolicy.lastUpdatedTimestamp
				}
			});
		});

		it('should return agreements that are outdated', () => {
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
								last_updated_at_ms: toNullable(
									agreementsData.privacyPolicy.lastUpdatedTimestamp + 2n
								)
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

			expect(get(outdatedAgreements)).toEqual({
				licenseAgreement: {
					accepted: true,
					lastAcceptedTimestamp: 1677628802n,
					lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp - 1n
				},
				privacyPolicy: {
					accepted: true,
					lastAcceptedTimestamp: 1677628800n,
					lastUpdatedTimestamp: agreementsData.privacyPolicy.lastUpdatedTimestamp + 2n
				}
			});
		});

		it('should return an empty object if all agreements are accepted and up-to-date', () => {
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

			expect(get(outdatedAgreements)).toEqual({});
		});

		it('should return the agreements that are either rejected, or outdated, or both', () => {
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
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp + 5n)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toEqual({
				licenseAgreement: {
					accepted: false,
					lastAcceptedTimestamp: 1677628802n,
					lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp - 1n
				},
				termsOfUse: {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: agreementsData.termsOfUse.lastUpdatedTimestamp + 5n
				}
			});
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

			expect(get(outdatedAgreements)).toEqual({
				newAgreement: nullishAgreement
			});
		});
	});

	describe('hasOutdatedAgreements', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();
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

	describe('hasAcceptedAllLatestAgreements', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();
		});

		it('should return false when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return false when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return false when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return false if there is at least one agreement that was not visioned yet', () => {
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

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return false if there is at least one agreement that was rejected', () => {
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

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return false if there is at least one agreement that is outdated', () => {
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

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return true if all agreements are accepted and up-to-date', () => {
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

			expect(get(hasAcceptedAllLatestAgreements)).toBeTruthy();
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

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});

		it('should return false if all agreements are rejected, even if up-to-date', () => {
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
								last_updated_at_ms: toNullable(agreementsData.licenseAgreement.lastUpdatedTimestamp)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp)
							}
						}
					})
				}
			});

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
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

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});
	});
});
