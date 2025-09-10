import type {
	UserAgreement as BackendUserAgreement,
	UserAgreements as BackendUserAgreements
} from '$declarations/backend/backend.did';
import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { formatSecondsToDate } from '$lib/utils/format.utils';
import { fromNullable, nonNullish, toNullable } from '@dfinity/utils';

export const getAgreementLastUpdated = ({
	type,
	$i18n
}: {
	type: keyof EnvAgreements;
	$i18n: I18n;
}): string =>
	formatSecondsToDate({
		seconds: Number(agreementsData[type]?.lastUpdatedTimestamp / BigInt(MILLISECONDS_IN_SECOND)),
		language: $i18n.lang,
		formatOptions: {
			minute: undefined,
			hour: undefined
		}
	});

export const mapUserAgreement = (backendUserAgreement: BackendUserAgreement): AgreementData => ({
	accepted: fromNullable(backendUserAgreement.accepted),
	lastAcceptedTimestamp: fromNullable(backendUserAgreement.last_accepted_at_ns),
	lastUpdatedTimestamp: fromNullable(backendUserAgreement.last_updated_at_ms)
});

const mapBackendUserAgreement = (userAgreement: AgreementData | undefined): BackendUserAgreement =>
	nonNullish(userAgreement)
		? {
				accepted: toNullable(userAgreement.accepted),
				last_accepted_at_ns: toNullable(userAgreement.lastAcceptedTimestamp),
				last_updated_at_ms: toNullable(userAgreement.lastUpdatedTimestamp)
			}
		: {
				accepted: toNullable(),
				last_accepted_at_ns: toNullable(),
				last_updated_at_ms: toNullable()
			};

export const mapBackendUserAgreements = (
	agreements: Partial<UserAgreements>
): BackendUserAgreements => ({
	license_agreement: mapBackendUserAgreement(agreements.licenseAgreement),
	privacy_policy: mapBackendUserAgreement(agreements.privacyPolicy),
	terms_of_use: mapBackendUserAgreement(agreements.termsOfUse)
});
