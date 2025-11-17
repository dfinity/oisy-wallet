import { initGldtStakeStore } from '$icp/stores/gldt-stake.store';
import { stakePositionMockResponse } from '$tests/mocks/gldt_stake.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('gldt-stake.store', () => {
	const apyValue = 10;

	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => initGldtStakeStore().setApy(apyValue));
	});

	it('should have all expected values', () => {
		const store = initGldtStakeStore();

		store.setApy(apyValue);
		store.setPosition(stakePositionMockResponse);

		expect(get(store)).toStrictEqual({ apy: apyValue, position: stakePositionMockResponse });
	});

	it('should reset the value', () => {
		const store = initGldtStakeStore();

		store.setApy(apyValue);
		store.setPosition(stakePositionMockResponse);
		store.reset();

		expect(get(store)).toBeUndefined();
	});
});
