import { BTC_REGTEST_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import {
	initCertifiedStore,
	type CertifiedStore,
	type WritableUpdateStore
} from '$lib/stores/certified.store';
import { get } from 'svelte/store';

describe('certified.store', () => {
	describe('initCertifiedStore', () => {
		interface MockData {
			name: string;
			values: number[];
		}

		const data: MockData = { name: 'Test Item', values: [1, 2, 3] };
		let mockStore: CertifiedStore<MockData> & WritableUpdateStore<MockData>;

		beforeEach(() => {
			mockStore = initCertifiedStore<MockData>();
		});

		it('should initialise with undefined state', () => {
			expect(get(mockStore)).toBeUndefined();
		});

		describe('reset', () => {
			it('should reset a specific tokenId to null', () => {
				mockStore.update((current) => ({
					...current,
					[SEPOLIA_TOKEN_ID]: data
				}));

				mockStore.reset(SEPOLIA_TOKEN_ID);

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toBeNull();
			});

			it('should keep other records unchanged when resetting a specific tokenId', () => {
				const otherData: MockData = { name: 'Other Item', values: [4, 5, 6] };

				mockStore.update((current) => ({
					...current,
					[SEPOLIA_TOKEN_ID]: data,
					[BTC_REGTEST_TOKEN_ID]: otherData
				}));

				mockStore.reset(SEPOLIA_TOKEN_ID);

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toBeNull();
				expect(state?.[BTC_REGTEST_TOKEN_ID]).toEqual(otherData);
			});

			it('should not throw an error when resetting an unknown tokenId', () => {
				expect(() => mockStore.reset(SEPOLIA_TOKEN_ID)).not.toThrow();
			});
		});
	});
});
