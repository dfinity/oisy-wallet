import * as agreementsEnv from '$env/agreements.env';
import { agreementsData } from '$env/agreements.env';
import {
	agreementsToAccept,
	atLeastOneAgreementVisioned,
	hasAcceptedAllLatestAgreements,
	hasOutdatedAgreements,
	noAgreementVisionedYet,
	outdatedAgreements,
	userAgreements
} from '$lib/derived/user-agreements.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { AgreementData, AgreementsToAccept, UserAgreements } from '$lib/types/user-agreements';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-agreements.derived', () => {
	const certified = false;

	const nullishAgreement: AgreementData = {
		accepted: undefined,
		lastAcceptedTimestamp: undefined,
		lastUpdatedTimestamp: undefined,
		textSha256: undefined
	};

	const expectedNullishAgreements: UserAgreements = {
		licenseAgreement: nullishAgreement,
		privacyPolicy: nullishAgreement,
		termsOfUse: nullishAgreement
	};

	describe('userAgreements', () => {
		it('should return undefined data when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userAgreements)).toStrictEqual(expectedNullishAgreements);
		});

		it('should return undefined data when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(userAgreements)).toStrictEqual(expectedNullishAgreements);
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
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
							}
						}
					})
				}
			});

			expect(get(userAgreements)).toStrictEqual({
				licenseAgreement: nullishAgreement,
				privacyPolicy: {
					accepted: false,
					lastAcceptedTimestamp: 1677628800n,
					lastUpdatedTimestamp: 1677542400n,
					textSha256: '3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
				},
				termsOfUse: {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: 1677542401n,
					textSha256: '52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
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
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
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
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(),
								last_accepted_at_ns: toNullable(),
								last_updated_at_ms: toNullable(),
								text_sha256: toNullable()
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
							}
						}
					})
				}
			});

			expect(get(noAgreementVisionedYet)).toBeFalsy();
		});
	});

	describe('atLeastOneAgreementVisioned', () => {
		it('should return false when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(atLeastOneAgreementVisioned)).toBeFalsy();
		});

		it('should return false when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(atLeastOneAgreementVisioned)).toBeFalsy();
		});

		it('should return false if all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(atLeastOneAgreementVisioned)).toBeFalsy();
		});

		it('should return true if there is at least one agreement accepted', () => {
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
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							}
						}
					})
				}
			});

			expect(get(atLeastOneAgreementVisioned)).toBeTruthy();
		});

		it('should return true if there is at least one agreement rejected', () => {
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
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							}
						}
					})
				}
			});

			expect(get(atLeastOneAgreementVisioned)).toBeTruthy();
		});

		it('should return true if all agreements are accepted', () => {
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
							}
						}
					})
				}
			});

			expect(get(atLeastOneAgreementVisioned)).toBeTruthy();
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
							}
						}
					})
				}
			});

			expect(get(atLeastOneAgreementVisioned)).toBeTruthy();
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(),
								last_accepted_at_ns: toNullable(),
								last_updated_at_ms: toNullable(),
								text_sha256: toNullable()
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
							}
						}
					})
				}
			});

			expect(get(atLeastOneAgreementVisioned)).toBeTruthy();
		});
	});

	describe('outdatedAgreements', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();
		});

		it('should return all agreements when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(outdatedAgreements)).toStrictEqual(expectedNullishAgreements);
		});

		it('should return all agreements when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual(expectedNullishAgreements);
		});

		it('should return all agreements when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(outdatedAgreements)).toStrictEqual(expectedNullishAgreements);
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
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual({
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual({
				licenseAgreement: {
					accepted: false,
					lastAcceptedTimestamp: 1677628802n,
					lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp,
					textSha256: agreementsData.licenseAgreement.textSha256
				},
				privacyPolicy: {
					accepted: false,
					lastAcceptedTimestamp: 1677628800n,
					lastUpdatedTimestamp: agreementsData.privacyPolicy.lastUpdatedTimestamp,
					textSha256: agreementsData.privacyPolicy.textSha256
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
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(
									agreementsData.privacyPolicy.lastUpdatedTimestamp + 2n
								),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual({
				licenseAgreement: {
					accepted: true,
					lastAcceptedTimestamp: 1677628802n,
					lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp - 1n,
					textSha256: agreementsData.licenseAgreement.textSha256
				},
				privacyPolicy: {
					accepted: true,
					lastAcceptedTimestamp: 1677628800n,
					lastUpdatedTimestamp: agreementsData.privacyPolicy.lastUpdatedTimestamp + 2n,
					textSha256: agreementsData.privacyPolicy.textSha256
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual({});
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
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp + 5n),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual({
				licenseAgreement: {
					accepted: false,
					lastAcceptedTimestamp: 1677628802n,
					lastUpdatedTimestamp: agreementsData.licenseAgreement.lastUpdatedTimestamp - 1n,
					textSha256: agreementsData.licenseAgreement.textSha256
				},
				termsOfUse: {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: agreementsData.termsOfUse.lastUpdatedTimestamp + 5n,
					textSha256: agreementsData.termsOfUse.textSha256
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(outdatedAgreements)).toStrictEqual({
				newAgreement: nullishAgreement
			});
		});
	});

	describe('agreementsToAccept', () => {
		const expectedTrueAgreements: AgreementsToAccept = {
			licenseAgreement: true,
			privacyPolicy: true,
			termsOfUse: true
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.resetAllMocks();
		});

		it('should return all agreements when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(agreementsToAccept)).toStrictEqual(expectedTrueAgreements);
		});

		it('should return all agreements when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual(expectedTrueAgreements);
		});

		it('should return all agreements when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			expect(get(agreementsToAccept)).toStrictEqual(expectedTrueAgreements);
		});

		it('should return the agreements that are not accepted yet', () => {
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
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual({
				licenseAgreement: true,
				privacyPolicy: true
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual({
				licenseAgreement: true,
				privacyPolicy: true
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
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(
									agreementsData.privacyPolicy.lastUpdatedTimestamp + 2n
								),
								text_sha256: toNullable('differentTextSha256')
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual({
				licenseAgreement: true,
				privacyPolicy: true
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual({});
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
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp + 5n),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual({
				licenseAgreement: true,
				termsOfUse: true
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(agreementsToAccept)).toStrictEqual({
				newAgreement: true
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
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(),
								last_accepted_at_ns: toNullable(),
								last_updated_at_ms: toNullable(),
								text_sha256: toNullable()
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(1677542400n),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(1677542402n),
								text_sha256: toNullable(
									'248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
								)
							},
							privacy_policy: {
								accepted: toNullable(),
								last_accepted_at_ns: toNullable(),
								last_updated_at_ms: toNullable(),
								text_sha256: toNullable(
									'3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
								)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(1677542401n),
								text_sha256: toNullable(
									'52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
								)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(false),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
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
								last_updated_at_ms: toNullable(
									agreementsData.licenseAgreement.lastUpdatedTimestamp
								),
								text_sha256: toNullable(agreementsData.licenseAgreement.textSha256)
							},
							privacy_policy: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628800n),
								last_updated_at_ms: toNullable(agreementsData.privacyPolicy.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.privacyPolicy.textSha256)
							},
							terms_of_use: {
								accepted: toNullable(true),
								last_accepted_at_ns: toNullable(1677628801n),
								last_updated_at_ms: toNullable(agreementsData.termsOfUse.lastUpdatedTimestamp),
								text_sha256: toNullable(agreementsData.termsOfUse.textSha256)
							}
						}
					})
				}
			});

			expect(get(hasAcceptedAllLatestAgreements)).toBeFalsy();
		});
	});
});
