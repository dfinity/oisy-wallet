import * as storageUtils from '$lib/utils/storage.utils';
import type { MockInstance } from 'vitest';

describe('nft-list store', () => {
	let spyStorageSet: MockInstance;
	let spyStorageGet: MockInstance;

	beforeEach(() => {
		vi.resetAllMocks();
		spyStorageSet = vi.spyOn(storageUtils, 'set');
		spyStorageGet = vi.spyOn(storageUtils, 'get').mockReturnValue(undefined);
	});

	describe('toggleLock', () => {
		it.todo('should toggle from false to true');

		it.todo('should toggle from true to false');
	});
});
