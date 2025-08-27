import agreementsJson from '$env/agreements.json';
import { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type { EnvAgreement } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { formatSecondsToDate } from '$lib/utils/format.utils';
import * as z from 'zod/v4';

const parseAgreementsJson = () => z.parse(EnvAgreementsSchema, agreementsJson);

export const getAgreementLastUpdated = ({
	type,
	$i18n
}: {
	type: keyof EnvAgreement;
	$i18n: I18n;
}): string =>
	formatSecondsToDate({
		seconds: parseAgreementsJson()[type]?.lastUpdatedTimestamp / MILLISECONDS_IN_SECOND,
		language: $i18n.lang,
		formatOptions: {
			minute: undefined,
			hour: undefined
		}
	});
