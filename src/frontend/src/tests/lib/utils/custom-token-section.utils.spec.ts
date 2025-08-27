import { mapTokenSection } from '$lib/utils/custom-token-section.utils';
import { CustomTokenSection } from '$lib/enums/custom-token-section';

describe('custom-token-section.utils', () => {
	it('should return custom token type spam', () => {
		const result = mapTokenSection({ Spam: null })

		expect(result).toEqual(CustomTokenSection.SPAM)
	})

	it('should return custom token type hidden', () => {
		const result = mapTokenSection({ Hidden: null })

		expect(result).toEqual(CustomTokenSection.HIDDEN)
	})
})