import * as agreementsEnv from '$env/agreements.env';
import type { EnvAgreements } from '$env/types/env-agreements';
import { MILLISECONDS_IN_SECOND } from '$lib/constants/app.constants';
import {
	getAgreementLastUpdated,
	transformAgreementsJsonBigint
} from '$lib/utils/agreements.utils';
import { formatSecondsToDate } from '$lib/utils/format.utils';

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

vi.spyOn(agreementsEnv, 'agreementsData', 'get').mockImplementation(
	() => transformAgreementsJsonBigint(mock) as unknown as EnvAgreements
);

describe('agreements.utils', () => {
	describe('getAgreementLastUpdated', () => {
		beforeEach(() => {
			vi.restoreAllMocks();
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

	describe('transformAgreementsJsonBigint', () => {
		it('converts all __bigint__ markers to bigint and preserves other fields', () => {
			const out = transformAgreementsJsonBigint({ ...mock });

			// Values are bigints
			expect(typeof out.licenseAgreement.lastUpdatedTimestamp).toBe('bigint');
			expect(typeof out.termsOfUse.lastUpdatedTimestamp).toBe('bigint');
			expect(typeof out.privacyPolicy.lastUpdatedTimestamp).toBe('bigint');

			// Exact bigint value
			expect(out.licenseAgreement.lastUpdatedTimestamp).toBe(1756245600000n);
			expect(out.termsOfUse.lastUpdatedTimestamp).toBe(1756245600000n);
			expect(out.privacyPolicy.lastUpdatedTimestamp).toBe(1756245600000n);

			// Other fields preserved
			expect(out.licenseAgreement.lastUpdatedDate).toBe('2025-08-27T06:15Z');
			expect(out.termsOfUse.lastUpdatedDate).toBe('2025-08-27T06:15Z');
			expect(out.privacyPolicy.lastUpdatedDate).toBe('2025-08-27T06:15Z');
		});
	});
});
