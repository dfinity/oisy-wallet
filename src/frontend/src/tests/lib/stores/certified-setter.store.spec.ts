import { SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import {
	initCertifiedSetterStore,
	type CertifiedSetterStoreStore
} from '$lib/stores/certified-setter.store';
import type { WritableUpdateStore } from '$lib/stores/certified.store';
import { get } from 'svelte/store';

describe('certified-setter.store', () => {
	describe('initCertifiedSetterStore', () => {
		interface MockData {
			name: string;
			values: number[];
		}

		const data: MockData = { name: 'Test Item', values: [1, 2, 3] };
		let mockStore: CertifiedSetterStoreStore<MockData> & WritableUpdateStore<MockData>;

		beforeEach(() => {
			mockStore = initCertifiedSetterStore<MockData>();
		});

		it('should initialise with undefined state', () => {
			expect(get(mockStore)).toBeUndefined();
		});

		describe('set', () => {
			it('should set data for a specific tokenId', () => {
				mockStore.set({ id: SEPOLIA_TOKEN_ID, data });

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toEqual(data);
			});

			it('should update data for a specific tokenId', () => {
				const updatedData: MockData = { name: 'Updated Item', values: [4, 5, 6] };

				mockStore.set({ id: SEPOLIA_TOKEN_ID, data });
				mockStore.set({ id: SEPOLIA_TOKEN_ID, data: updatedData });

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toEqual(updatedData);
			});

			it('should not throw an error when setting an unknown tokenId', () => {
				expect(() => mockStore.set({ id: SEPOLIA_TOKEN_ID, data })).not.toThrow();
			});
		});
	});
});
