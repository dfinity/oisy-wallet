import { initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import type { UtxosFee } from '$btc/types/btc-send';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { get } from 'svelte/store';

const mockUtxosFee: UtxosFee = {
	feeSatoshis: 1000n,
	utxos: [
		{
			height: 1000,
			value: 1n,
			outpoint: {
				txid: [1, 2, 3],
				vout: 1
			}
		}
	]
};

describe('utxosFeeStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		const store = initUtxosFeeStore();

		await testDerivedUpdates(() =>
			store.setUtxosFee({
				utxosFee: mockUtxosFee
			})
		);
	});

	it('should have all expected values', () => {
		const store = initUtxosFeeStore();

		store.setUtxosFee({
			utxosFee: mockUtxosFee
		});

		expect(get(store)?.utxosFee).toStrictEqual(mockUtxosFee);
	});
});
