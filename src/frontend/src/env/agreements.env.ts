import agreementsJson from '$env/agreements.json';
import { EnvAgreementsSchema } from '$env/schema/env-agreements.schema';
import type { EnvAgreement } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { i18n } from '$lib/stores/i18n.store';
import { parseBoolEnvVar } from '$lib/utils/env.utils';
import { formatSecondsToDate } from '$lib/utils/format.utils';
import { get } from 'svelte/store';
import * as z from 'zod/v4';

export const NEW_AGREEMENTS_ENABLED = parseBoolEnvVar(
	import.meta.env.VITE_FRONTEND_NEW_AGREEMENTS_ENABLED
);

export const getAgreementLastUpdated = (type: keyof EnvAgreement) => {
	const { data } = z.safeParse(EnvAgreementsSchema, agreementsJson);

	return formatSecondsToDate({
		seconds: data[type]?.lastUpdatedTimestamp / MILLISECONDS_IN_SECOND,
		language: get(i18n).lang,
		formatOptions: {
			minute: undefined,
			hour: undefined
		}
	});
};
