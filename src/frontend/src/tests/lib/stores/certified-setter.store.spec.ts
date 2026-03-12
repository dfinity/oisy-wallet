import { BTC_MAINNET_TOKEN_ID } from '$env/tokens/tokens.btc.env';
import { SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import {
	initCertifiedSetterStore,
	type CertifiedSetterStoreStore
} from '$lib/stores/certified-setter.store';
import type { WritableUpdateStore } from '$lib/stores/certified.store';
import type { TokenId } from '$lib/types/token';
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
			vi.useFakeTimers();
			mockStore = initCertifiedSetterStore<MockData>();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		const flushScheduledBatch = async () => {
			await vi.runAllTimersAsync();
		};

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
				expect(() => mockStore.set({ id: SEPOLIA_TOKEN_ID, data })).not.toThrowError();
			});
		});

		describe('batchSet', () => {
			it('should not update the store synchronously', () => {
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });

				expect(get(mockStore)).toBeUndefined();
			});

			it('should flush a single item to the store', async () => {
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });

				await flushScheduledBatch();

				expect(get(mockStore)?.[SEPOLIA_TOKEN_ID]).toEqual(data);
			});

			it('should batch multiple items into one store update', async () => {
				const btcData: MockData = { name: 'BTC', values: [10] };
				const icpData: MockData = { name: 'ICP', values: [20] };

				mockStore.batchSet({ id: BTC_MAINNET_TOKEN_ID, data: btcData });
				mockStore.batchSet({ id: ICP_TOKEN_ID, data: icpData });

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual(btcData);
				expect(state?.[ICP_TOKEN_ID]).toEqual(icpData);
			});

			it('should notify subscribers only once for a batch of calls', async () => {
				const subscriber = vi.fn();
				const unsubscribe = mockStore.subscribe(subscriber);

				subscriber.mockClear();

				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });
				mockStore.batchSet({
					id: BTC_MAINNET_TOKEN_ID,
					data: { name: 'BTC', values: [10] }
				});
				mockStore.batchSet({
					id: ICP_TOKEN_ID,
					data: { name: 'ICP', values: [20] }
				});

				await flushScheduledBatch();

				expect(subscriber).toHaveBeenCalledTimes(1);

				unsubscribe();
			});

			it('should use the last value when the same id is set multiple times', async () => {
				const firstData: MockData = { name: 'First', values: [1] };
				const secondData: MockData = { name: 'Second', values: [2] };

				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data: firstData });
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data: secondData });

				await flushScheduledBatch();

				expect(get(mockStore)?.[SEPOLIA_TOKEN_ID]).toEqual(secondData);
			});

			it('should preserve existing store state when flushing', async () => {
				mockStore.set({ id: SEPOLIA_TOKEN_ID, data });

				const btcData: MockData = { name: 'BTC', values: [10] };
				mockStore.batchSet({ id: BTC_MAINNET_TOKEN_ID, data: btcData });

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toEqual(data);
				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual(btcData);
			});

			it('should allow successive batches across multiple flush cycles', async () => {
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });

				await flushScheduledBatch();

				const btcData: MockData = { name: 'BTC', values: [10] };
				mockStore.batchSet({ id: BTC_MAINNET_TOKEN_ID, data: btcData });

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toEqual(data);
				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual(btcData);
			});

			it('should not flush items removed by reset before the flush fires', async () => {
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });
				mockStore.batchSet({
					id: BTC_MAINNET_TOKEN_ID,
					data: { name: 'BTC', values: [10] }
				});

				mockStore.reset(SEPOLIA_TOKEN_ID);

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toBeNull();
				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual({ name: 'BTC', values: [10] });
			});

			it('should discard the entire pending batch on reinitialize', async () => {
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });
				mockStore.batchSet({
					id: BTC_MAINNET_TOKEN_ID,
					data: { name: 'BTC', values: [10] }
				});

				mockStore.reinitialize();

				await flushScheduledBatch();

				expect(get(mockStore)).toBeUndefined();
			});

			it('should accept new batchSet calls after reinitialize', async () => {
				mockStore.batchSet({ id: SEPOLIA_TOKEN_ID, data });

				mockStore.reinitialize();

				const btcData: MockData = { name: 'BTC', values: [10] };
				mockStore.batchSet({ id: BTC_MAINNET_TOKEN_ID, data: btcData });

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toBeUndefined();
				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual(btcData);
			});

			it('should handle interleaved set and batchSet', async () => {
				const setData: MockData = { name: 'Sync', values: [100] };
				const batchData: MockData = { name: 'Batched', values: [200] };

				mockStore.set({ id: SEPOLIA_TOKEN_ID, data: setData });
				mockStore.batchSet({ id: BTC_MAINNET_TOKEN_ID, data: batchData });

				expect(get(mockStore)?.[SEPOLIA_TOKEN_ID]).toEqual(setData);
				expect(get(mockStore)?.[BTC_MAINNET_TOKEN_ID]).toBeUndefined();

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toEqual(setData);
				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual(batchData);
			});

			it('should handle batchSet on a store that has been reset for a different id', async () => {
				mockStore.set({ id: SEPOLIA_TOKEN_ID, data });
				mockStore.reset(SEPOLIA_TOKEN_ID);

				const btcData: MockData = { name: 'BTC', values: [10] };
				mockStore.batchSet({ id: BTC_MAINNET_TOKEN_ID, data: btcData });

				await flushScheduledBatch();

				const state = get(mockStore);

				expect(state?.[SEPOLIA_TOKEN_ID]).toBeNull();
				expect(state?.[BTC_MAINNET_TOKEN_ID]).toEqual(btcData);
			});

			it('should batch many items efficiently', async () => {
				const ids: TokenId[] = Array.from({ length: 50 }, (_, i) =>
					Symbol(`token-${i}`)
				) as TokenId[];

				for (const id of ids) {
					mockStore.batchSet({ id, data: { name: `Token ${String(id)}`, values: [1] } });
				}

				await flushScheduledBatch();

				const state = get(mockStore);

				for (const id of ids) {
					expect(state?.[id]).toBeDefined();
				}
			});
		});
	});
});
