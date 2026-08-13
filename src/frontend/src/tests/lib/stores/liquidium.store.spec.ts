import { liquidiumStore } from '$lib/stores/liquidium.store';
import type { LiquidiumStoreData } from '$lib/types/liquidium';
import { get } from 'svelte/store';

describe('liquidium.store', () => {
	const data: LiquidiumStoreData = {
		markets: [
			{
				poolId: 'pool-btc',
				asset: 'BTC',
				chain: 'BTC',
				supplyApy: 5,
				borrowApy: 9,
				frozen: false,
				available: true
			}
		],
		portfolio: null,
		assetPrices: {}
	};

	beforeEach(() => {
		liquidiumStore.reset();
	});

	it('initializes with empty markets, no portfolio and not loaded', () => {
		expect(get(liquidiumStore)).toEqual({
			markets: [],
			portfolio: null,
			assetPrices: {},
			loaded: false
		});
	});

	it('replaces the store data on set', () => {
		liquidiumStore.set(data);

		expect(get(liquidiumStore)).toEqual({ ...data, loaded: false });
	});

	it('keeps the loaded flag across a set', () => {
		liquidiumStore.setLoaded(true);
		liquidiumStore.set(data);

		expect(get(liquidiumStore)).toEqual({ ...data, loaded: true });
	});

	it('flips the loaded flag without touching the data', () => {
		liquidiumStore.set(data);
		liquidiumStore.setLoaded(true);

		expect(get(liquidiumStore)).toEqual({ ...data, loaded: true });
	});

	it('restores the default value on reset', () => {
		liquidiumStore.set(data);
		liquidiumStore.setLoaded(true);
		liquidiumStore.reset();

		expect(get(liquidiumStore)).toEqual({
			markets: [],
			portfolio: null,
			assetPrices: {},
			loaded: false
		});
	});
});
