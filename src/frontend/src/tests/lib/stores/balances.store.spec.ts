import { ICP_TOKEN } from '$env/tokens.env';
import { balancesStore } from '$lib/stores/balances.store';
import { BigNumber } from 'alchemy-sdk';
import { describe, it } from 'vitest';
import { mockPageStore } from '../../mocks/page.store.mock';
import { testDerivedUpdates } from '../../utils/derived.utils';

mockPageStore();

describe('balancesStore', () => {
	it('should ensure derived stores update at most once when the store changes', async () => {
		await testDerivedUpdates(() =>
			balancesStore.set({
				tokenId: ICP_TOKEN.id,
				data: { data: BigNumber.from(1n), certified: true }
			})
		);
	});
});
