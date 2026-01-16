import { initAllUtxosStore } from '$btc/stores/all-utxos.store';
import { mockUtxo } from '$tests/mocks/btc.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('allUtxosStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	const mockAllUtxos = [mockUtxo];

	it('should ensure derived stores update at most once when the store changes', async () => {
		const store = initAllUtxosStore();

		await testDerivedUpdates(() =>
			store.setAllUtxos({
				allUtxos: mockAllUtxos
			})
		);
	});

	it('should have all expected values', () => {
		const store = initAllUtxosStore();

		store.setAllUtxos({
			allUtxos: mockAllUtxos
		});

		expect(get(store)?.allUtxos).toStrictEqual(mockAllUtxos);
	});

	it('should reset the value', () => {
		const store = initAllUtxosStore();

		store.setAllUtxos({
			allUtxos: mockAllUtxos
		});
		store.reset();

		expect(get(store)?.allUtxos).toBeUndefined();
	});

	it('should start with undefined value', () => {
		const store = initAllUtxosStore();

		expect(get(store)).toBeUndefined();
	});

	it('should set null after reset', () => {
		const store = initAllUtxosStore();

		store.setAllUtxos({
			allUtxos: mockAllUtxos
		});
		store.reset();

		expect(get(store)).toBeNull();
	});
});
