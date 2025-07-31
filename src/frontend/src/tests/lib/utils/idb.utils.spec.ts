import { delMultiKeysByPrincipal } from '$lib/utils/idb.utils';
import { mockPrincipal } from '$tests/mocks/identity.mock';
import { delMany, keys, type UseStore } from 'idb-keyval';

describe('idb.utils', () => {
	describe('delMultiKeysByPrincipal', () => {
		const expectedKeys = [
			[mockPrincipal.toText(), 'token1', 'network1'],
			[mockPrincipal.toText(), 'token2', 'network2']
		];

		const nonMatchingKeys = [
			['mockPrincipal2', 'token1', 'network1'],
			['mockPrincipal2', 'token3', 'network3'],
			['mockPrincipal3', 'token1', 'network1']
		];

		const mockKeys = [...expectedKeys, ...nonMatchingKeys];

		const mockStore = {} as unknown as UseStore;

		const mockParams = { principal: mockPrincipal, store: mockStore };

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(keys).mockResolvedValue(mockKeys);
		});

		it('should delete the data with the correct keys', async () => {
			await delMultiKeysByPrincipal(mockParams);

			expect(keys).toHaveBeenCalledExactlyOnceWith(mockStore);
			expect(delMany).toHaveBeenCalledExactlyOnceWith(expectedKeys, mockStore);
		});

		it('should not delete anything if no keys match the principal', async () => {
			vi.mocked(keys).mockResolvedValueOnce(nonMatchingKeys);

			await delMultiKeysByPrincipal(mockParams);

			expect(delMany).not.toHaveBeenCalled();
		});

		it('should handle empty keys array', async () => {
			vi.mocked(keys).mockResolvedValueOnce([]);

			await delMultiKeysByPrincipal(mockParams);

			expect(delMany).not.toHaveBeenCalled();
		});

		it('should handle errors gracefully', async () => {
			vi.mocked(delMany).mockRejectedValueOnce(new Error('Mocked error'));

			await expect(delMultiKeysByPrincipal(mockParams)).rejects.toThrow();

			expect(delMany).toHaveBeenCalledExactlyOnceWith(expectedKeys, mockStore);
		});

		it('should handle keys that are not arrays', async () => {
			const mixedKeys = [
				[mockPrincipal.toText(), 'token1', 'network1'],
				['someOtherKey'],
				[mockPrincipal.toText(), 'token2', 'network2']
			];

			vi.mocked(keys).mockResolvedValueOnce(mixedKeys);

			await delMultiKeysByPrincipal(mockParams);

			expect(delMany).toHaveBeenCalledExactlyOnceWith([mixedKeys[0], mixedKeys[2]], mockStore);
		});
	});
});
