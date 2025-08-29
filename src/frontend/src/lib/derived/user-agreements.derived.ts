import { agreementsData } from '$env/agreements.env';
import { userAgreementsData } from '$lib/derived/user-profile.derived';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { mapUserAgreement } from '$lib/utils/agreements.utils';
import { isNullish, nonNullish } from '@dfinity/utils';
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

export const noAgreementVisionedYet: Readable<boolean> = derived(
	[userAgreements],
	([$userAgreements]) =>
		isNullish($userAgreements.licenseAgreement.accepted) &&
		isNullish($userAgreements.privacyPolicy.accepted) &&
		isNullish($userAgreements.termsOfUse.accepted)
);

export const outdatedAgreements: Readable<Partial<UserAgreements>> = derived(
	[userAgreements],
	([$userAgreements]) =>
		Object.entries(agreementsData).reduce<Partial<UserAgreements>>(
			(outdatedAcc, [key, { lastUpdatedTimestamp }]) => {
				const userAgreement =
					key in $userAgreements ? $userAgreements[key as keyof UserAgreements] : undefined;

				if (isNullish(userAgreement)) {
					return {
						...outdatedAcc,
						[key]: {
							accepted: undefined,
							lastAcceptedTimestamp: undefined,
							lastUpdatedTimestamp: undefined
						}
					};
				}

				const { lastUpdatedTimestamp: userAgreementUpdatedTimestamp, accepted } = userAgreement;

				if (
					userAgreementUpdatedTimestamp !== lastUpdatedTimestamp ||
					isNullish(accepted) ||
					!accepted
				) {
					return { ...outdatedAcc, [key]: userAgreement };
				}

				return outdatedAcc;
			},
			{}
		)
);

export const hasOutdatedAgreements: Readable<boolean> = derived(
	[outdatedAgreements],
	([$outdatedAgreements]) => Object.keys($outdatedAgreements).length > 0
);

const allAgreementsAreUpToDate: Readable<boolean> = derived(
	[hasOutdatedAgreements],
	([$hasOutdatedAgreements]) => !$hasOutdatedAgreements
);

const hasAcceptedAllAgreements: Readable<boolean> = derived(
	[userAgreements],
	([
		{
			licenseAgreement: { accepted: licenseAgreementAccepted },
			privacyPolicy: { accepted: privacyPolicyAccepted },
			termsOfUse: { accepted: termsOfUseAccepted }
		}
	]) =>
		nonNullish(licenseAgreementAccepted) &&
		licenseAgreementAccepted &&
		nonNullish(privacyPolicyAccepted) &&
		privacyPolicyAccepted &&
		nonNullish(termsOfUseAccepted) &&
		termsOfUseAccepted
);

export const hasAcceptedAllLatestAgreements: Readable<boolean> = derived(
	[hasAcceptedAllAgreements, allAgreementsAreUpToDate],
	([$hasAcceptedAllAgreements, $allAgreementsAreUpToDate]) =>
		$hasAcceptedAllAgreements && $allAgreementsAreUpToDate
);
