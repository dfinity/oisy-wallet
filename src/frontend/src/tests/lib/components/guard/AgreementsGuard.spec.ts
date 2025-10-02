import { agreementsData } from '$env/agreements.env';
import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
import { AGREEMENTS_MODAL } from '$lib/constants/test-ids.constants';
import { acceptAgreements } from '$lib/services/user-agreements.services';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockAuthStore } from '$tests/mocks/auth.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { mockSnippet } from '$tests/mocks/snippet.mock';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { fromNullable, toNullable } from '@dfinity/utils';
import { render } from '@testing-library/svelte';
import { tick } from 'svelte';

vi.mock('$lib/services/user-agreements.services', () => ({
	acceptAgreements: vi.fn()
}));

describe('AgreementsGuard', () => {
	const certified = false;

	const mockParams = { children: mockSnippet };

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuthStore();

		userProfileStore.reset();
	});

	it('should render the modal if there is at least one agreement rejected', async () => {
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

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should render the modal if all agreements are rejected', async () => {
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

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should render the modal if some agreements are nullish, some accepted and some rejected', async () => {
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

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should render the modal if there is at least one agreement that was not viewed yet', async () => {
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

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should render the modal if there is at least one agreement that was rejected', async () => {
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

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should render the modal if there is at least one agreement that is outdated', async () => {
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

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should render the children (not the modal) if all agreements are accepted', () => {
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

		const { getByTestId, queryByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId('mock-snippet')).toBeInTheDocument();
		expect(queryByTestId(AGREEMENTS_MODAL)).not.toBeInTheDocument();
	});

	it('should render the children (not the modal) when user profile is not set', () => {
		userProfileStore.reset();

		const { getByTestId, queryByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId('mock-snippet')).toBeInTheDocument();
		expect(queryByTestId(AGREEMENTS_MODAL)).not.toBeInTheDocument();
	});

	it('should render the children (not the modal) when user agreements data are nullish', () => {
		userProfileStore.set({
			certified,
			profile: {
				...mockUserProfile,
				agreements: toNullable()
			}
		});

		const { getByTestId, queryByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId('mock-snippet')).toBeInTheDocument();
		expect(queryByTestId(AGREEMENTS_MODAL)).not.toBeInTheDocument();
	});

	it('should render the children (not the modal) when all agreements are nullish', () => {
		userProfileStore.set({
			certified,
			profile: mockUserProfile
		});

		const { getByTestId, queryByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId('mock-snippet')).toBeInTheDocument();
		expect(queryByTestId(AGREEMENTS_MODAL)).not.toBeInTheDocument();
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

		render(AgreementsGuard, mockParams);

		await tick();

		expect(acceptAgreements).not.toHaveBeenCalled();
	});

	it('should accept all the agreements if user profile is not set', async () => {
		userProfileStore.reset();

		render(AgreementsGuard, mockParams);

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

		render(AgreementsGuard, mockParams);

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

		render(AgreementsGuard, mockParams);

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
});
