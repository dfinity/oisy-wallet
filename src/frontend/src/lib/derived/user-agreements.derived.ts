import { userAgreementsData } from '$lib/derived/user-profile.derived';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { mapUserAgreement } from '$lib/utils/agreements.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userAgreements: Readable<UserAgreements> = derived(
	[userAgreementsData],
	([$userAgreementsData]) => {
		const agreements = $userAgreementsData?.agreements;

		if (nonNullish(agreements)) {
			return {
				licenseAgreement: mapUserAgreement(agreements.license_agreement),
				privacyPolicy: mapUserAgreement(agreements.privacy_policy),
				termsOfUse: mapUserAgreement(agreements.terms_of_use)
			};
		}

		const nullishAgreement: AgreementData = {
			accepted: undefined,
			lastAcceptedTimestamp: undefined,
			lastUpdatedTimestamp: undefined
		};

		return {
			licenseAgreement: nullishAgreement,
			privacyPolicy: nullishAgreement,
			termsOfUse: nullishAgreement
		};
	}
);
