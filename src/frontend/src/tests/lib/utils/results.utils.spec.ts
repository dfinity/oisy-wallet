import type { ResultSuccess } from '$lib/types/utils';
import { reduceResults } from '$lib/utils/results.utils';

describe('reduceResults', () => {
	it('should return a successful result when all results are successful', () => {
		const results: ResultSuccess<string>[] = [{ success: true }, { success: true }];

		const reduced = reduceResults(results);

		expect(reduced).toEqual({ success: true, err: undefined });
	});

	it('should return a failed result with errors when any result is unsuccessful', () => {
		const results: ResultSuccess<string>[] = [
			{ success: true, err: undefined },
			{ success: false, err: 'Error 1' },
			{ success: true },
			{ success: false, err: 'Error 2' }
		];

		const reduced = reduceResults(results);

		expect(reduced).toEqual({ success: false, err: ['Error 1', 'Error 2'] });
	});

	it('should ignore undefined errors', () => {
		const results: ResultSuccess<string>[] = [
			{ success: true, err: undefined },
			{ success: false, err: 'Error 1' },
			{ success: true },
			{ success: false, err: undefined }
		];

		const reduced = reduceResults(results);

		expect(reduced).toEqual({ success: false, err: ['Error 1'] });
	});

	it('should handle empty results array', () => {
		const reduced = reduceResults([]);

		expect(reduced).toEqual({ success: true, err: undefined });
	});
});
