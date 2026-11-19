import { COLLECTION_PARAM, NETWORK_PARAM, NFT_PARAM } from '$lib/constants/routes.constants';
import { routeCollection, routeNft } from '$lib/derived/nav.derived';
import { loadRouteParams } from '$lib/utils/nav.utils';
import { mockPage } from '$tests/mocks/page.store.mock';
import type { LoadEvent } from '@sveltejs/kit';
import { get } from 'svelte/store';

describe('nav.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
	});

	describe('routeNft', () => {
		// Regression: routeNft used to destructure a hard-coded `nft` key while the
		// loader writes NFT_PARAM. `page.data` is untyped, so the mismatch silently
		// yielded undefined and the collectible detail page never opened.
		it('should read the same key that loadRouteParams writes', () => {
			const url = new URL('https://oisy.com/collectibles/');
			url.searchParams.set(NFT_PARAM, '10393');
			url.searchParams.set(COLLECTION_PARAM, '0x206571b68c66E1d112b74d65695043ad2b5F95D5');
			url.searchParams.set(NETWORK_PARAM, 'BASE');

			mockPage.mock(loadRouteParams({ url } as LoadEvent));

			expect(get(routeNft)).toBe('10393');
			expect(get(routeCollection)).toBe('0x206571b68c66E1d112b74d65695043ad2b5F95D5');
		});

		it('should be nullish when the collectible param is absent', () => {
			const url = new URL('https://oisy.com/collectibles/');
			url.searchParams.set(COLLECTION_PARAM, '0x206571b68c66E1d112b74d65695043ad2b5F95D5');

			mockPage.mock(loadRouteParams({ url } as LoadEvent));

			expect(get(routeNft)).toBeNull();
		});
	});
});
