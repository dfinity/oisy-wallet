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

	it('initializes with empty markets and no portfolio', () => {
		expect(get(liquidiumStore)).toEqual({
			markets: [],
			portfolio: null,
			assetPrices: {}
		});
	});

	it('replaces the store data on set', () => {
		liquidiumStore.set(data);

		expect(get(liquidiumStore)).toEqual(data);
	});

	it('restores the default value on reset', () => {
		liquidiumStore.set(data);
		liquidiumStore.reset();

		expect(get(liquidiumStore)).toEqual({
			markets: [],
			portfolio: null,
			assetPrices: {}
		});
	});
});
