import * as agreementsEnv from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import { getAgreementLastUpdated } from '$lib/utils/agreements.utils';
import { transformAgreementsJsonBigint } from '$lib/utils/env.agreements.utils';
import { formatSecondsToDate } from '$lib/utils/format.utils';

describe('agreements.utils', () => {
	describe('getAgreementLastUpdated', () => {
		const mock = {
			licenseAgreement: {
				lastUpdatedDate: '2025-08-27T06:15Z',
				lastUpdatedTimestamp: { __bigint__: '1756245600000' }
			},
			termsOfUse: {
				lastUpdatedDate: '2025-08-27T06:15Z',
				lastUpdatedTimestamp: { __bigint__: '1756245600000' }
			},
			privacyPolicy: {
				lastUpdatedDate: '2025-08-27T06:15Z',
				lastUpdatedTimestamp: { __bigint__: '1756245600000' }
			}
		};

		beforeEach(() => {
			vi.restoreAllMocks();

			vi.spyOn(agreementsEnv, 'agreementsData', 'get').mockImplementation(
				() => transformAgreementsJsonBigint(mock) as unknown as EnvAgreements
			);
		});

		it('parses env JSON with z.parse(schema, data) and formats the expected section', () => {
			const i18n: Partial<I18n> = { lang: 'en' };

			const result = getAgreementLastUpdated({
				type: 'privacyPolicy',
				$i18n: i18n as unknown as I18n
			});

			expect(result).toEqual(
				formatSecondsToDate({
					seconds: Number(
						transformAgreementsJsonBigint(mock).privacyPolicy.lastUpdatedTimestamp /
							BigInt(MILLISECONDS_IN_SECOND)
					),
					formatOptions: {
						hour: undefined,
						minute: undefined
					}
				})
			);
		});
	});
});
