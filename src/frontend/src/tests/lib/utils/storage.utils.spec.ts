import { delByPrefix } from '$lib/utils/storage.utils';

describe('storage.utils', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	describe('delByPrefix', () => {
		it('should remove all the entries whose key starts with the prefix', () => {
			localStorage.setItem('prefix_a', 'a');
			localStorage.setItem('prefix_b', 'b');

			delByPrefix({ prefix: 'prefix_' });

			expect(localStorage.getItem('prefix_a')).toBeNull();
			expect(localStorage.getItem('prefix_b')).toBeNull();
		});

		it('should keep the entries whose key does not start with the prefix', () => {
			localStorage.setItem('prefix_a', 'a');
			localStorage.setItem('other', 'other');
			localStorage.setItem('a_prefix_', 'a_prefix_');

			delByPrefix({ prefix: 'prefix_' });

			expect(localStorage.getItem('prefix_a')).toBeNull();
			expect(localStorage.getItem('other')).toBe('other');
			expect(localStorage.getItem('a_prefix_')).toBe('a_prefix_');
		});

		it('should do nothing if no key starts with the prefix', () => {
			localStorage.setItem('other', 'other');

			delByPrefix({ prefix: 'prefix_' });

			expect(localStorage).toHaveLength(1);
			expect(localStorage.getItem('other')).toBe('other');
		});

		it('should not throw and log the error if the local storage fails', () => {
			const err = new Error('Storage failure');

			const spyRemoveItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
				throw err;
			});
			const spyConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

			localStorage.setItem('prefix_a', 'a');

			expect(() => delByPrefix({ prefix: 'prefix_' })).not.toThrow();

			expect(spyRemoveItem).toHaveBeenCalledExactlyOnceWith('prefix_a');
			expect(spyConsoleError).toHaveBeenCalledOnce();

			spyRemoveItem.mockRestore();
		});
	});
});
