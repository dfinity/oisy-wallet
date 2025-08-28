import type { UserAgreement as BackendUserAgreement } from '$declarations/backend/backend.did';
import agreementsJson from '$env/agreements.json';
import { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import type { AgreementData } from '$lib/types/user-agreements';
import { formatSecondsToDate } from '$lib/utils/format.utils';
import { fromNullable } from '@dfinity/utils';
import * as z from 'zod/v4';

const transformJsonBigint = (
	json: Record<string, { lastUpdatedTimestamp: { __bigint__: string } }>
) => {
	const res: Record<string, { lastUpdatedTimestamp: bigint }> = {};
	Object.entries(json).forEach(([key, value]) => {
		res[key] = {
			...value,
			lastUpdatedTimestamp: BigInt(value.lastUpdatedTimestamp.__bigint__)
		};
	});
	return res;
};

export const parseAgreementsJson = (): EnvAgreements =>
	z.parse(EnvAgreementsSchema, transformJsonBigint(agreementsJson));

export const getAgreementLastUpdated = ({
	type,
	$i18n
}: {
	type: keyof EnvAgreements;
	$i18n: I18n;
}): string =>
	formatSecondsToDate({
		seconds: Number(
			parseAgreementsJson()[type]?.lastUpdatedTimestamp / BigInt(MILLISECONDS_IN_SECOND)
		),
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
