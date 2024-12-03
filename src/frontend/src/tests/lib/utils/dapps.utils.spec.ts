import { type OisyDappDescription } from '$lib/types/dapp-description';
import { filterCarouselDapps } from '$lib/utils/dapps.utils';
import { mockDappsDescriptions } from '$tests/mocks/dapps.mock';
import { nonNullish } from '@dfinity/utils';

describe('dapps.utils', () => {
	describe('filterCarouselDapps', () => {
		const mockDapps: OisyDappDescription[] = mockDappsDescriptions.filter(({ carousel }) =>
			nonNullish(carousel)
		);

		it('should filter out dApps with a nullish carousel property', () => {
			const dAppDescriptions: OisyDappDescription[] = [
				{ ...mockDapps[0], carousel: undefined },
				...mockDapps.slice(1)
			];

			expect(filterCarouselDapps(dAppDescriptions)).toStrictEqual(mockDapps.slice(1));
		});

		it('should return the same array if no dApps are filtered out', () => {
			expect(filterCarouselDapps(mockDapps)).toEqual(mockDapps);
		});

		it('should return an empty array if all dApps have nullish carousel property', () => {
			expect(
				filterCarouselDapps(mockDapps.map((dapps) => ({ ...dapps, carousel: undefined })))
			).toEqual([]);
		});
	});
});
