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
		fee: 1000n,
		tokenSymbol: 'ICP'
	};

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() => icTokenFeeStore.setIcTokenFee(data));
	});

	it('should have all expected values', () => {
		icTokenFeeStore.setIcTokenFee(data);

		expect(get(icTokenFeeStore)).toStrictEqual({ [data.tokenSymbol]: data.fee });
	});

	it('should reset the value', () => {
		icTokenFeeStore.setIcTokenFee(data);
		icTokenFeeStore.reset();

		expect(get(icTokenFeeStore)).toBe(null);
	});
});
