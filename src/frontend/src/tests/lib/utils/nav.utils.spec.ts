import { resetRouteParams, type RouteParams } from '$lib/utils/nav.utils';

describe('resetRouteParams', () => {
	it('should return an object with all values set to null', () => {
		const result = resetRouteParams();

		Object.keys(result).forEach((key) => {
			expect(result[key as keyof RouteParams]).toBeNull();
		});
	});
});
