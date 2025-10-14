import { initGldtStakeApyStore } from '$icp/stores/gldt-stake-apy.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('gldt-stake-apy.store', () => {
	const apyValue = 10;

	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => initGldtStakeApyStore().setApy(apyValue));
	});

	it('should have all expected values', () => {
		const store = initGldtStakeApyStore();

		store.setApy(apyValue);

		expect(get(store)).toStrictEqual({ apy: apyValue });
	});

	it('should reset the value', () => {
		const store = initGldtStakeApyStore();

		store.setApy(apyValue);
		store.reset();

		expect(get(store)).toBeUndefined();
	});
});
