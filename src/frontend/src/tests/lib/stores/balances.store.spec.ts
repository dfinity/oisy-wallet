import { ICP_TOKEN } from '$env/tokens.env';
import { balancesStore } from '$lib/stores/balances.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.utils';
import { BigNumber } from 'alchemy-sdk';

describe('balancesStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			balancesStore.set({
				tokenId: ICP_TOKEN.id,
				data: { data: BigNumber.from(1n), certified: true }
			})
		);
	});
});
