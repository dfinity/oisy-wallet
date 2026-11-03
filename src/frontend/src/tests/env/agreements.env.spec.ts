import { agreementsData } from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import type { AgreementData, UserAgreements } from '$lib/types/user-agreements';
import { mapBackendUserAgreements } from '$lib/utils/agreements.utils';
import { fromNullable } from '@dfinity/utils';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Agents create OISY profiles through the backend API, so they record agreement acceptance with the
 * values `get_api_doc` lists instead of reading `agreements.json`. A Terms of Use update that misses
 * the guide would have agents record acceptance of a version the user never saw. The backend's own
 * check only runs when backend files change, and an update usually touches `agreements.json` alone,
 * so this check runs with the frontend tests on every PR.
 */
describe('agreements.env', () => {
	const apiDoc = readFileSync(join(process.cwd(), 'src/backend/src/api/api_doc.md'), 'utf-8');

	const acceptedOnSignIn = ({
		lastUpdatedTimestamp,
		textSha256
	}: EnvAgreements[keyof EnvAgreements]): AgreementData => ({
		accepted: true,
		lastAcceptedTimestamp: undefined,
		lastUpdatedTimestamp,
		textSha256
	});

	const agreements: UserAgreements = {
		termsOfUse: acceptedOnSignIn(agreementsData.termsOfUse),
		privacyPolicy: acceptedOnSignIn(agreementsData.privacyPolicy),
		licenseAgreement: acceptedOnSignIn(agreementsData.licenseAgreement)
	};

	it.each(
		Object.entries(mapBackendUserAgreements(agreements)).map(([name, agreement]) => ({
			name,
			...agreement
		}))
	)(
		'should list in the API guide what the web app records for $name',
		({ name, last_updated_at_ms, text_sha256 }) => {
			const row = apiDoc.split('\n').find((line) => line.startsWith(`| \`${name}\``));

			expect(row).toBeDefined();
			expect(row).toContain(`\`${fromNullable(last_updated_at_ms)}\``);
			expect(row).toContain(`\`${fromNullable(text_sha256)}\``);
		}
	);
});
