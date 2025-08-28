import type { EnvAgreements } from '$env/types/env-agreements';
import { userAgreementsData } from '$lib/derived/user-profile.derived';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { mapUserAgreement, parseAgreementsJson } from '$lib/utils/agreements.utils';
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

const outdatedAgreements: Readable<Partial<UserAgreements>> = derived(
	[userAgreements],
	([$userAgreements]) => {
		const currentAgreements: EnvAgreements = parseAgreementsJson();

		return Object.entries(currentAgreements).reduce<Partial<UserAgreements>>(
			(outdatedAcc, [key, { lastUpdatedTimestamp }]) => {
				const userAgreement =
					key in $userAgreements ? $userAgreements[key as keyof UserAgreements] : undefined;

				if (
					userAgreement?.lastAcceptedTimestamp !== lastUpdatedTimestamp ||
					isNullish(userAgreement.accepted) ||
					!userAgreement.accepted
				) {
					return { ...outdatedAcc, [key]: userAgreement };
				}

				return outdatedAcc;
			},
			{}
		);
	}
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
	([$userAgreements]) =>
		($userAgreements.licenseAgreement.accepted &&
			$userAgreements.privacyPolicy.accepted &&
			$userAgreements.termsOfUse.accepted) ??
		false
);

export const hasAcceptedAllLatestAgreements: Readable<boolean> = derived(
	[hasAcceptedAllAgreements, allAgreementsAreUpToDate],
	([$hasAcceptedAllAgreements, $allAgreementsAreUpToDate]) =>
		$hasAcceptedAllAgreements && $allAgreementsAreUpToDate
);
