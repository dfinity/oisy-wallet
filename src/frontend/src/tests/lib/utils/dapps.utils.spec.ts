import type { OisyDappDescription } from '$lib/types/dapp-description';
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

			expect(filterCarouselDapps({ dAppDescriptions, hiddenDappsIds: [] })).toStrictEqual(
				mockDapps.slice(1)
			);
		});

		it('should filter out dApps whose ids are in hiddenDappsIds', () => {
			expect(
				filterCarouselDapps({
					dAppDescriptions: mockDapps,
					hiddenDappsIds: [mockDapps[0].id]
				})
			).toEqual(mockDapps.slice(1));
		});

		it('should return an empty array if all dApps are filtered out', () => {
			expect(
				filterCarouselDapps({
					dAppDescriptions: mockDapps,
					hiddenDappsIds: mockDapps.map(({ id }) => id)
				})
			).toEqual([]);
		});

		it('should return the same array if no dApps are filtered out', () => {
			expect(
				filterCarouselDapps({
					dAppDescriptions: mockDapps,
					hiddenDappsIds: []
				})
			).toEqual(mockDapps);
		});

		it('should return an empty array if all dApps have nullish carousel property', () => {
			expect(
				filterCarouselDapps({
					dAppDescriptions: mockDapps.map((dapps) => ({ ...dapps, carousel: undefined })),
					hiddenDappsIds: []
				})
			).toEqual([]);
		});
	});
});
