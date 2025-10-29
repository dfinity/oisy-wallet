import { agreementsData } from '$env/agreements.env';
import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
import { AGREEMENTS_WARNING_BANNER } from '$lib/constants/test-ids.constants';
import { acceptAgreements } from '$lib/services/user-agreements.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { fromNullable, toNullable } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$lib/services/user-agreements.services', () => ({
	acceptAgreements: vi.fn()
}));

describe('AgreementsGuard', () => {
	const certified = false;

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		userProfileStore.reset();
	});

	it('should not accept any agreement if they are all already accepted and up-to-date', async () => {
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
							last_updated_at_ms: toNullable(agreementsData.licenseAgreement.lastUpdatedTimestamp),
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should accept all the agreements if user profile is not set', async () => {
		userProfileStore.reset();

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			}
		});
	});

	it('should accept all the agreements if user agreements data are nullish', async () => {
		userProfileStore.set({
			certified,
			profile: {
				...mockUserProfile,
				agreements: toNullable()
			}
		});

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept all the agreements if all agreements are nullish', async () => {
		userProfileStore.set({
			certified,
			profile: mockUserProfile
		});

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept all the agreements if there is at least one agreement rejected', async () => {
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept the agreements if all agreements are rejected', async () => {
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept the agreements if some agreements are nullish, some accepted and some rejected', async () => {
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept the agreements if there is at least one agreement that was not viewed yet', async () => {
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept the agreements if there is at least one agreement that was rejected', async () => {
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
							last_updated_at_ms: toNullable(agreementsData.licenseAgreement.lastUpdatedTimestamp),
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept the agreements if there is at least one agreement that is outdated', async () => {
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

		render(AgreementsGuard);

		await tick();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true
			},
			currentUserVersion: fromNullable(mockUserProfile.version)
		});
	});

	it('should accept the agreements only once at the same time', async () => {
		vi.useFakeTimers();

		userProfileStore.reset();

		render(AgreementsGuard);

		// We mock quick changes of the user profile to test that the agreements are accepted only once
		userProfileStore.set({
			certified,
			profile: mockUserProfile
		});
		userProfileStore.reset();

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			}
		});

		await vi.advanceTimersByTimeAsync(10_000);

		expect(acceptAgreements).toHaveBeenCalledExactlyOnceWith({
			identity: mockIdentity,
			agreementsToAccept: {
				licenseAgreement: true,
				privacyPolicy: true,
				termsOfUse: true
			}
		});

		vi.useRealTimers();
	});

	describe('with the Agreements banner', () => {
		const certified = false;

		beforeEach(() => {
			vi.clearAllMocks();

			userProfileStore.reset();
		});

		it('should not render if all agreements are accepted', () => {
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

			const { queryByTestId } = render(AgreementsGuard);

			expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
		});

		it('should not render when user profile is not set', () => {
			userProfileStore.reset();

			const { queryByTestId } = render(AgreementsGuard);

			expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
		});

		it('should not render when user agreements data are nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			const { queryByTestId } = render(AgreementsGuard);

			expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
		});

		it('should not render when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			const { queryByTestId } = render(AgreementsGuard);

			expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
		});

		it('should render if there is at least one agreement rejected', () => {
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

			const { getByTestId } = render(AgreementsGuard);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});

		it('should render if all agreements are rejected', () => {
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

			const { getByTestId } = render(AgreementsGuard);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});

		it('should render if some agreements are nullish, some accepted and some rejected', () => {
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

			const { getByTestId } = render(AgreementsGuard);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});

		it('should render if there is at least one agreement that was not viewed yet', () => {
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

			const { getByTestId } = render(AgreementsGuard);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});

		it('should render if there is at least one agreement that was rejected', () => {
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

			const { getByTestId } = render(AgreementsGuard);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});

		it('should render if there is at least one agreement that is outdated', () => {
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

			const { getByTestId } = render(AgreementsGuard);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});
	});
});
