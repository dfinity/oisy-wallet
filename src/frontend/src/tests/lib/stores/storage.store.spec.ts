import { initStorageStore, type StorageStore } from '$lib/stores/storage.store';
import { del as delStorage, get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { get } from 'svelte/store';

vi.mock('$lib/utils/storage.utils', () => ({
	set: vi.fn(),
	get: vi.fn(),
	del: vi.fn()
}));

describe('storage.store', () => {
	describe('initStorageStore', () => {
		interface MockData {
			name: string;
			values: number[];
		}

		const mockData: MockData = { name: 'Test Data', values: [1, 2, 3] };

		const mockKey = 'mock-data';

		const mockParams = { key: mockKey, value: mockData };

		let mockStore: StorageStore<MockData>;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(getStorage).mockImplementation(() => {});

			mockStore = initStorageStore<MockData>({ key: mockKey });
		});

		it('should initialize with the value from storage', () => {
			vi.mocked(getStorage).mockImplementation(() => mockData);

			const store = initStorageStore<MockData>({ key: mockKey });

			expect(get(store)).toEqual(mockData);
		});

		it('should initialize undefined if no value is stored', () => {
			vi.mocked(getStorage).mockImplementation(() => undefined);

			const store = initStorageStore<MockData>({ key: mockKey });

			expect(get(store)).toBeUndefined();
		});

		describe('set', () => {
			it('should set the value in storage', () => {
				mockStore.set(mockParams);

				expect(get(mockStore)).toEqual(mockData);
				expect(setStorage).toHaveBeenCalledExactlyOnceWith(mockParams);
			});

			it('should update the store', () => {
				mockStore.set(mockParams);

				const newValue = { name: 'Test Data 2', values: [4, 5, 6] };

				mockStore.set({ key: mockKey, value: newValue });

				expect(get(mockStore)).toEqual(newValue);
			});
		});

		describe('reset', () => {
			it('should delete the value in storage', () => {
				mockStore.set(mockParams);

				expect(get(mockStore)).toEqual(mockData);

				mockStore.reset({ key: mockKey });

				expect(delStorage).toHaveBeenCalledExactlyOnceWith({ key: mockKey });
			});

			it('should set the store to null', () => {
				mockStore.set(mockParams);

				expect(get(mockStore)).toEqual(mockData);

				mockStore.reset({ key: mockKey });

				expect(get(mockStore)).toBeNull();
			});
		});
	});
});
