import { utxosFeeStore } from '$btc/stores/utxos-fee.store';
import { mockUtxosFee } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { get } from 'svelte/store';

describe('utxosFeeStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	const amount = 10;

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			utxosFeeStore.setUtxosFee({
				utxosFee: mockUtxosFee,
				amount
			})
		);
	});

	it('should have all expected values', () => {
		utxosFeeStore.setUtxosFee({
			utxosFee: mockUtxosFee,
			amount
		});

		expect(get(utxosFeeStore)?.utxosFee).toStrictEqual(mockUtxosFee);
		expect(get(utxosFeeStore)?.amount).toStrictEqual(amount);
	});

	it('should reset the value', () => {
		utxosFeeStore.setUtxosFee({
			utxosFee: mockUtxosFee,
			amount
		});
		utxosFeeStore.reset();

		expect(get(utxosFeeStore)?.utxosFee).toBe(undefined);
		expect(get(utxosFeeStore)?.amount).toBe(undefined);
	});
});
