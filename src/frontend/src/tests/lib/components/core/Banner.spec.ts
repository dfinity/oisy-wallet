import { agreementsData } from '$env/agreements.env';
import Banner from '$lib/components/core/Banner.svelte';
import { AGREEMENTS_WARNING_BANNER } from '$lib/constants/test-ids.constants';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { render } from '@testing-library/svelte';

describe('Banner', () => {
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

			const { queryByTestId } = render(Banner);

			expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
		});

		it('should not render when user profile is not set', () => {
			userProfileStore.reset();

			const { queryByTestId } = render(Banner);

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

			const { queryByTestId } = render(Banner);

			expect(queryByTestId(AGREEMENTS_WARNING_BANNER)).not.toBeInTheDocument();
		});

		it('should not render when all agreements are nullish', () => {
			userProfileStore.set({
				certified,
				profile: mockUserProfile
			});

			const { queryByTestId } = render(Banner);

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
								last_updated_at_ms: toNullable(1677542400n)
							}
						}
					})
				}
			});

			const { getByTestId } = render(Banner);

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

			const { getByTestId } = render(Banner);

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

			const { getByTestId } = render(Banner);

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

			const { getByTestId } = render(Banner);

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

			const { getByTestId } = render(Banner);

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

			const { getByTestId } = render(Banner);

			expect(getByTestId(AGREEMENTS_WARNING_BANNER)).toBeInTheDocument();
		});
	});
});
