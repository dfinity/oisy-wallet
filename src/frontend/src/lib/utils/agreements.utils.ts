import type { UserAgreement as BackendUserAgreement } from '$declarations/backend/backend.did';
import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { AgreementData } from '$lib/types/user-agreements';
import { formatSecondsToDate } from '$lib/utils/format.utils';
import { fromNullable } from '@dfinity/utils';

export const transformAgreementsJsonBigint = (
	json: Record<string, { lastUpdatedTimestamp: { __bigint__: string }; lastUpdatedDate: string }>
): EnvAgreements => {
	const res: Record<string, { lastUpdatedTimestamp: bigint; lastUpdatedDate: string }> = {};
	Object.entries(json).forEach(
		([
			key,
			{
				lastUpdatedTimestamp: { __bigint__ },
				...rest
			}
		]) => {
			res[key] = {
				...rest,
				lastUpdatedTimestamp: BigInt(__bigint__)
			};
		}
	);
	return res as EnvAgreements;
};

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
