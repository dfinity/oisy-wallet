import { CustomTokenSection } from '$lib/enums/custom-token-section';
import { mapCustomTokenSection, mapTokenSection } from '$lib/utils/custom-token-section.utils';

describe('custom-token-section.utils', () => {
	describe('mapTokenSection', () => {
		it('should return custom token type spam', () => {
			const result = mapTokenSection({ Spam: null });

			expect(result).toEqual(CustomTokenSection.SPAM);
		});

		it('should return custom token type hidden', () => {
			const result = mapTokenSection({ Hidden: null });

			expect(result).toEqual(CustomTokenSection.HIDDEN);
		});
	})

	describe('mapCustomTokenSection', () => {
		it('should return token section spam', () => {
			const result = mapCustomTokenSection(CustomTokenSection.SPAM);

			expect(result).toEqual({ Spam: null });
		});

		it('should return token section hidden', () => {
			const result = mapCustomTokenSection(CustomTokenSection.HIDDEN);

			expect(result).toEqual({ Hidden: null });
		});
	});
});
