import { initStorageStore, type StorageStore } from '$lib/stores/storage.store';
import type { Option } from '$lib/types/utils';
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
		const mockData2: MockData = { name: 'Test Data 2', values: [4, 5, 6] };

		const mockKey = 'mock-data';

		const mockParams = { key: mockKey, value: mockData };

		let mockStore: StorageStore<MockData>;

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(getStorage).mockImplementation(() => {});

			mockStore = initStorageStore<MockData>({ key: mockKey, defaultValue: mockData2 });
		});

		it('should initialize with the value from storage', () => {
			vi.mocked(getStorage).mockImplementation(() => mockData);

			const store = initStorageStore<MockData>({ key: mockKey, defaultValue: mockData2 });

			expect(get(store)).toEqual(mockData);
		});

		it('should initialize with default value if no value is stored', () => {
			vi.mocked(getStorage).mockImplementation(() => undefined);

			const store = initStorageStore<MockData>({ key: mockKey, defaultValue: mockData2 });

			expect(get(store)).toEqual(mockData2);
		});

		describe('set', () => {
			it('should set the value in storage', () => {
				mockStore.set(mockParams);

				expect(get(mockStore)).toEqual(mockData);
				expect(setStorage).toHaveBeenCalledExactlyOnceWith(mockParams);
			});

			it('should update the store', () => {
				mockStore.set(mockParams);
				mockStore.set({ key: mockKey, value: mockData2 });

				expect(get(mockStore)).toEqual(mockData2);
			});
		});

		describe('reset', () => {
			it('should delete the value in storage', () => {
				mockStore.set(mockParams);

				expect(get(mockStore)).toEqual(mockData);

				mockStore.reset({ key: mockKey });

				expect(delStorage).toHaveBeenCalledExactlyOnceWith({ key: mockKey });
			});

			it('should reset the store to default value', () => {
				mockStore.set(mockParams);

				expect(get(mockStore)).toEqual(mockData);

				mockStore.reset({ key: mockKey });

				expect(get(mockStore)).toEqual(mockData2);
			});

			it('should reset the store to default value even if it is nullish', () => {
				const nullStore = initStorageStore<Option<MockData>>({ key: mockKey, defaultValue: null });

				nullStore.set(mockParams);

				expect(get(nullStore)).toEqual(mockData);

				nullStore.reset({ key: mockKey });

				expect(get(nullStore)).toBeNull();

				const undefinedStore = initStorageStore<Option<MockData>>({
					key: mockKey,
					defaultValue: undefined
				});

				undefinedStore.set(mockParams);

				expect(get(undefinedStore)).toEqual(mockData);

				undefinedStore.reset({ key: mockKey });

				expect(get(undefinedStore)).toBeUndefined();
			});
		});
	});
});
