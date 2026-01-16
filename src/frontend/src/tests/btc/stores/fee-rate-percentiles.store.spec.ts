import { initFeeRatePercentilesStore } from '$btc/stores/fee-rate-percentiles.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('feeRatePercentilesStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	const mockFeeRateFromPercentiles = 5000n;

	it('should ensure derived stores update at most once when the store changes', async () => {
		const store = initFeeRatePercentilesStore();

		await testDerivedUpdates(() =>
			store.setFeeRateFromPercentiles({
				feeRateFromPercentiles: mockFeeRateFromPercentiles
			})
		);
	});

	it('should have all expected values', () => {
		const store = initFeeRatePercentilesStore();

		store.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});

		expect(get(store)?.feeRateFromPercentiles).toStrictEqual(mockFeeRateFromPercentiles);
	});

	it('should reset the value', () => {
		const store = initFeeRatePercentilesStore();

		store.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});
		store.reset();

		expect(get(store)?.feeRateFromPercentiles).toBeUndefined();
	});

	it('should start with undefined value', () => {
		const store = initFeeRatePercentilesStore();

		expect(get(store)).toBeUndefined();
	});

	it('should set null after reset', () => {
		const store = initFeeRatePercentilesStore();

		store.setFeeRateFromPercentiles({
			feeRateFromPercentiles: mockFeeRateFromPercentiles
		});
		store.reset();

		expect(get(store)).toBeNull();
	});
});
