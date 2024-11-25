import { initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { get } from 'svelte/store';

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

	it('should reset the value', () => {
		const store = initUtxosFeeStore();

		store.setUtxosFee({
			utxosFee: mockUtxosFee
		});
		store.reset();

		expect(get(store)?.utxosFee).toBe(undefined);
	});
});
