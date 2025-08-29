import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { formatSecondsToDate } from '$lib/utils/format.utils';

export const getAgreementLastUpdated = ({
	type,
	$i18n
}: {
	type: keyof EnvAgreements;
	$i18n: I18n;
}): string =>
	formatSecondsToDate({
		seconds: agreementsData[type]?.lastUpdatedTimestamp / MILLISECONDS_IN_SECOND,
		language: $i18n.lang,
		formatOptions: {
			minute: undefined,
			hour: undefined
		}
	});
