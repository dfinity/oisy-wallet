import { transformAgreementsJsonBigint } from '$lib/utils/env.agreements.utils';

describe('env.agreements.utils', () => {
	describe('transformAgreementsJsonBigint', () => {
		const mock = {
			licenceAgreement: {
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

		it('converts all __bigint__ markers to bigint and preserves other fields', () => {
			const out = transformAgreementsJsonBigint({ ...mock });

			// Values are bigints
			expect(typeof out.licenceAgreement.lastUpdatedTimestamp).toBe('bigint');
			expect(typeof out.termsOfUse.lastUpdatedTimestamp).toBe('bigint');
			expect(typeof out.privacyPolicy.lastUpdatedTimestamp).toBe('bigint');

			// Exact bigint value
			expect(out.licenceAgreement.lastUpdatedTimestamp).toBe(1756245600000n);
			expect(out.termsOfUse.lastUpdatedTimestamp).toBe(1756245600000n);
			expect(out.privacyPolicy.lastUpdatedTimestamp).toBe(1756245600000n);

			// Other fields preserved
			expect(out.licenceAgreement.lastUpdatedDate).toBe('2025-08-27T06:15Z');
			expect(out.termsOfUse.lastUpdatedDate).toBe('2025-08-27T06:15Z');
			expect(out.privacyPolicy.lastUpdatedDate).toBe('2025-08-27T06:15Z');
		});
	});
});
