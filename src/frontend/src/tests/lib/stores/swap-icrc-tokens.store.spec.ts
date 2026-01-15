import { ICP_TOKEN, TESTICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { IcTokenWithIcrc2Supported } from '$icp/types/ic-token';
import {
	swappableIcrcTokensStore,
	type SwappableTokensStore
} from '$lib/stores/swap-icrc-tokens.store';
import { get } from 'svelte/store';

describe('swappable-icrc-tokens.store', () => {
	describe('initSwappableIcrcTokensStore', () => {
		let mockStore: SwappableTokensStore;

		beforeEach(() => {
			mockStore = swappableIcrcTokensStore;
		});

		describe('setSwappableTokens', () => {
			it('should set tokens when store is empty', () => {
				const tokens: IcTokenWithIcrc2Supported[] = [
					{ ...ICP_TOKEN, isIcrc2: true },
					{ ...TESTICP_TOKEN, isIcrc2: false }
				];

				mockStore.setSwappableTokens(tokens);

				expect(get(mockStore)).toEqual(tokens);
			});

			it('should replace existing tokens with new ones', () => {
				const initialTokens: IcTokenWithIcrc2Supported[] = [{ ...ICP_TOKEN, isIcrc2: true }];

				mockStore.setSwappableTokens(initialTokens);

				const newTokens: IcTokenWithIcrc2Supported[] = [{ ...TESTICP_TOKEN, isIcrc2: false }];

				mockStore.setSwappableTokens(newTokens);

				expect(get(mockStore)).toEqual(newTokens);
			});

			it('should set an empty array', () => {
				const tokens: IcTokenWithIcrc2Supported[] = [{ ...TESTICP_TOKEN, isIcrc2: false }];

				mockStore.setSwappableTokens(tokens);
				mockStore.setSwappableTokens([]);

				expect(get(mockStore)).toEqual([]);
			});
		});
	});
});
