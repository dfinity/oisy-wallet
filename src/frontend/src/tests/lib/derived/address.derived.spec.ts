import {
	btcAddressMainnetNotLoaded,
	btcAddressRegtestNotLoaded,
	btcAddressTestnetNotLoaded,
	ethAddressNotLoaded,
	solAddressDevnetNotLoaded,
	solAddressLocalnetNotLoaded,
	solAddressMainnetNotLoaded
} from '$lib/derived/address.derived';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	ethAddressStore,
	solAddressDevnetStore,
	solAddressLocalnetStore,
	solAddressMainnetStore,
	type AddressStore
} from '$lib/stores/address.store';
import type { BtcAddress, EthAddress, SolAddress } from '$lib/types/address';
import { get, type Readable } from 'svelte/store';

describe('address.derived', () => {
	const notLoadedStoreList: [
		string,
		AddressStore<BtcAddress | EthAddress | SolAddress>,
		Readable<boolean>
	][] = [
		['btcAddressMainnetNotLoaded', btcAddressMainnetStore, btcAddressMainnetNotLoaded],
		['btcAddressTestnetNotLoaded', btcAddressTestnetStore, btcAddressTestnetNotLoaded],
		['btcAddressRegtestNotLoaded', btcAddressRegtestStore, btcAddressRegtestNotLoaded],
		['ethAddressNotLoaded', ethAddressStore, ethAddressNotLoaded],
		['solAddressMainnetNotLoaded', solAddressMainnetStore, solAddressMainnetNotLoaded],
		['solAddressDevnetNotLoaded', solAddressDevnetStore, solAddressDevnetNotLoaded],
		['solAddressLocalnetNotLoaded', solAddressLocalnetStore, solAddressLocalnetNotLoaded]
	];

	// eslint-disable-next-line local-rules/prefer-object-params
	describe.each(notLoadedStoreList)('%s', (_, store, notLoadedStore) => {
		it('should return true if address store is nullish', () => {
			store.reset();

			expect(get(notLoadedStore)).toBeTruthy();
		});

		it(`should return false if address store is not nullish`, () => {
			store.set({ data: 'mock-address', certified: false });

			expect(get(notLoadedStore)).toBeFalsy();
		});
	});
});
