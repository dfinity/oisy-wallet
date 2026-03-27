import type { UserExperimentalFeatures } from '$lib/types/user-experimental-features';
import { mapUserExperimentalFeatures } from '$lib/utils/user-experimental-features.utils';
import {
	mockUserExperimentalFeatures,
	mockUserExperimentalFeaturesMap
} from '$tests/mocks/user-experimental-features.mock';

describe('user-experimental-features.utils', () => {
	describe('mapUserExperimentalFeatures', () => {
		it('should convert UserExperimentalFeatures to the correct format', () => {
			expect(mapUserExperimentalFeatures(mockUserExperimentalFeatures)).toEqual(
				mockUserExperimentalFeaturesMap
			);
		});

		it('should ignore unknown feature IDs and log them to console', () => {
			const unknownFeatureId = 'unknownId';
			const userExperimentalFeatures = {
				...mockUserExperimentalFeatures,
				[unknownFeatureId]: { enabled: true }
			};

			expect(mapUserExperimentalFeatures(userExperimentalFeatures)).toEqual(
				mockUserExperimentalFeaturesMap
			);

			expect(console.warn).toHaveBeenCalledOnce();
			expect(console.warn).toHaveBeenNthCalledWith(1, `Unknown featureId: ${unknownFeatureId}`);
		});

		it('should handle empty UserExperimentalFeatures', () => {
			expect(mapUserExperimentalFeatures({} as UserExperimentalFeatures)).toEqual([]);
		});
	});
});
