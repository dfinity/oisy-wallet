import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { formatSecondsToDate } from '$lib/utils/format.utils';

export const transformAgreementsJsonBigint = (
	json: Record<string, { lastUpdatedTimestamp: { __bigint__: string }; lastUpdatedDate: string }>
) => {
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
	return res;
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
