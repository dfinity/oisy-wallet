import { ICP_TOKEN, ICP_TOKEN_ID } from '$env/tokens/tokens.icp.env';
import { ZERO } from '$lib/constants/app.constants';
import { swappableTokens } from '$lib/derived/swap.derived';
import { balancesStore } from '$lib/stores/balances.store';
import { mockPage } from '$tests/mocks/page.store.mock';
import { BigNumber } from 'alchemy-sdk';
import { get } from 'svelte/store';

describe('swap.derived', () => {
	describe('swappableTokens', () => {
		it('should return undefined for sourceToken and destinationToken', () => {
			const tokens = get(swappableTokens);
			expect(tokens.sourceToken).toBeUndefined();
			expect(tokens.destinationToken).toBeUndefined();
		});

		it('should return selected token as sourceToken and undefined for destinationToken', () => {
			mockPage.mock({ token: ICP_TOKEN.name, network: ICP_TOKEN.network.id.description });

			const icpBalance = BigNumber.from(2n);
			balancesStore.set({
				tokenId: ICP_TOKEN_ID,
				data: { data: icpBalance, certified: true }
			});

			const tokens = get(swappableTokens);
			expect(tokens.sourceToken).toEqual({ ...ICP_TOKEN, enabled: true });
			expect(tokens.destinationToken).toBeUndefined();
		});

		it('should return selected token as destinationToken and undefined for sourceToken', () => {
			mockPage.mock({ token: ICP_TOKEN.name, network: ICP_TOKEN.network.id.description });

			balancesStore.set({
				tokenId: ICP_TOKEN_ID,
				data: { data: ZERO, certified: true }
			});

			const tokens = get(swappableTokens);
			expect(tokens.sourceToken).toBeUndefined();
			expect(tokens.destinationToken).toEqual({ ...ICP_TOKEN, enabled: true });
		});
	});
});
