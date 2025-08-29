import { getAgreementLastUpdated } from '$lib/utils/agreements.utils';

// Mock the env JSON
vi.mock('$env/agreements.json', () => {
	const agreements = {
		licenceAgreement: {
			lastUpdatedDate: '2025-08-27T06:15Z',
			lastUpdatedTimestamp: 1756245000000
		},

		termsOfUse: {
			lastUpdatedDate: '2025-08-27T06:15Z',
			lastUpdatedTimestamp: 1756245000000
		},

		privacyPolicy: {
			lastUpdatedDate: '2025-08-27T06:15Z',
			lastUpdatedTimestamp: 1756245000000
		}
	};
	return { default: agreements };
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
});
