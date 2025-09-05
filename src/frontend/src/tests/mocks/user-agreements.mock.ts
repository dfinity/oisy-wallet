import type { UserAgreements } from '$lib/types/user-agreements';

export const mockUserAgreements: UserAgreements = {
	licenseAgreement: {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n
	},
	privacyPolicy: {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n
	},
	termsOfUse: {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n
	}
};
