import {
	getAgreementLastUpdated,
	transformAgreementsJsonBigint
} from '$lib/utils/agreements.utils';

const mockJson = {
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
// Mock the env JSON
vi.mock('$env/agreements.json', () => {
	return {
		default: {
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
		}
	};
});

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

			expect(result).toEqual('Aug 26, 2025');
		});
	});

	describe('transformAgreementsJsonBigint', () => {
		it('converts all __bigint__ markers to bigint and preserves other fields', () => {
			const out = transformAgreementsJsonBigint({ ...mockJson });

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

		it('does not mutate the input object', () => {
			const inputCopy = JSON.parse(JSON.stringify(mockJson)) as typeof mockJson;
			const out = transformAgreementsJsonBigint(inputCopy);

			// Input still has string marker, not bigint
			expect(inputCopy.licenceAgreement.lastUpdatedTimestamp.__bigint__).toBe('1756245600000');

			// Output is a different object at both root and leaf levels
			expect(out).not.toBe(inputCopy);
			expect(out.licenceAgreement).not.toBe(inputCopy.licenceAgreement);
		});

		it('throws when an invalid bigint string is encountered', () => {
			const bad = {
				licenceAgreement: {
					lastUpdatedDate: '2025-08-27T06:15Z',
					lastUpdatedTimestamp: { __bigint__: 'not-a-number' }
				}
			};

			expect(() => transformAgreementsJsonBigint(bad)).toThrow();
		});
	});
});
