import { icTokenFeeStore } from '$icp/stores/ic-token-fee.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';
import { get } from 'svelte/store';

describe('icTokenFeeStore', () => {
	beforeEach(() => {
		mockPage.reset();
		icTokenFeeStore.reset();
	});

	const data = {
		ICP: 1000n,
		ETH: 5000n
	};

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => icTokenFeeStore.setIcTokenFee(data));
	});

	it('should have all expected values', () => {
		icTokenFeeStore.setIcTokenFee(data);

		expect(get(icTokenFeeStore)?.ICP).toStrictEqual(data.ICP);
		expect(get(icTokenFeeStore)?.ETH).toStrictEqual(data.ETH);
	});

	it('should reset the value', () => {
		icTokenFeeStore.setIcTokenFee(data);
		icTokenFeeStore.reset();

		expect(get(icTokenFeeStore)).toBe(null);
	});
});
