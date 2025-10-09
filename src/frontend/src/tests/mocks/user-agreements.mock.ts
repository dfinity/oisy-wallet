import type { UserAgreements } from '$lib/types/user-agreements';

export const mockUserAgreements: UserAgreements = {
	licenseAgreement: {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n,
		textSha256: '248fd163ca7c0138714d824ba9f2b4378f1b122ad708f7e4d2225b3005d72979'
	},
	privacyPolicy: {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n,
		textSha256: '3c1f186b9348d5cdf17d438f98eb29909bb6bcb74f6f3b554b4abd4942064424'
	},
	termsOfUse: {
		accepted: true,
		lastAcceptedTimestamp: 1677628801n,
		lastUpdatedTimestamp: 1677628800n,
		textSha256: '52bab7b1b296314cec46c12fce499d77823acb27f85ff9ac2f8e4ec541878930'
	}
};
