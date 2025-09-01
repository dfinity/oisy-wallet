import * as agreementsEnv from '$env/agreements.env';
import { agreementsData } from '$env/agreements.env';
import AgreementsGuard from '$lib/components/guard/AgreementsGuard.svelte';
import { AGREEMENTS_MODAL } from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { createMockSnippet } from '$tests/mocks/snippet.mock';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('AgreementsGuard', () => {
	const certified = false;

	const mockSnippet = createMockSnippet('mock-snippet');

	const mockParams = { children: mockSnippet };

	beforeEach(() => {
		vi.clearAllMocks();

		userProfileStore.reset();

		vi.spyOn(agreementsEnv, 'NEW_AGREEMENTS_ENABLED', 'get').mockImplementation(() => true);
	});

	it('should render the modal when user profile is not set', () => {
		userProfileStore.reset();

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();
	});

	it('should render the modal when user agreements data are nullish', () => {
		userProfileStore.set({
			certified,
			profile: {
				...mockUserProfile,
				agreements: toNullable()
			}
		});

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();
	});

	it('should render the modal when all agreements are nullish', () => {
		userProfileStore.set({
			certified,
			profile: mockUserProfile
		});

		const { getByTestId } = render(AgreementsGuard, mockParams);

		expect(getByTestId(AGREEMENTS_MODAL)).toBeInTheDocument();
	});

	it('should render the modal if there is at least one agreement rejected', () => {
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
	});

	it('should render the modal if all agreements are rejected', () => {
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
	});

	it('should render the modal if some agreements are nullish, some accepted and some rejected', () => {
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
	});

	it('should render the modal if there is at least one agreement that was not visioned yet', () => {
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
	});

	it('should render the modal if there is at least one agreement that was rejected', () => {
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
	});

	it('should render the modal if there is at least one agreement that is outdated', () => {
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
});
