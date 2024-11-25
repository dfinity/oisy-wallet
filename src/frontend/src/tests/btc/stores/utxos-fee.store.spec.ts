import { initUtxosFeeStore } from '$btc/stores/utxos-fee.store';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { get } from 'svelte/store';

describe('utxosFeeStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	const amountForFee = 10;

	it('should ensure derived stores update at most once when the store changes', async () => {
		const store = initUtxosFeeStore();

		await testDerivedUpdates(() =>
			store.setUtxosFee({
				utxosFee: mockUtxosFee,
				amountForFee
			})
		);
	});

	it('should have all expected values', () => {
		const store = initUtxosFeeStore();

		store.setUtxosFee({
			utxosFee: mockUtxosFee,
			amountForFee
		});

		expect(get(store)?.utxosFee).toStrictEqual(mockUtxosFee);
		expect(get(store)?.amountForFee).toStrictEqual(amountForFee);
	});

	it('should reset the value', () => {
		const store = initUtxosFeeStore();

		store.setUtxosFee({
			utxosFee: mockUtxosFee,
			amountForFee
		});
		store.reset();

		expect(get(store)?.utxosFee).toBe(undefined);
		expect(get(store)?.amountForFee).toBe(undefined);
	});
});
