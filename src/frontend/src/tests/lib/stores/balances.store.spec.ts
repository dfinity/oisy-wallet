import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { balancesStore } from '$lib/stores/balances.store';
import { bn1Bi } from '$tests/mocks/balances.mock';
import { mockPage } from '$tests/mocks/page.store.mock';
import { testDerivedUpdates } from '$tests/utils/derived.test-utils';

describe('balancesStore', () => {
	beforeEach(() => {
		mockPage.reset();
	});

	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			balancesStore.set({
				id: ICP_TOKEN.id,
				data: { data: bn1Bi, certified: true }
			})
		);
	});
});
