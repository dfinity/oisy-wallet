import {
	routeCollection,
	routeNetwork,
	routeNft,
	routeNftNetwork,
	routeToken
} from '$lib/derived/nav.derived';
import { mockPage } from '$tests/mocks/page.store.mock';
import { get } from 'svelte/store';

describe('nav.derived', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		mockPage.reset();
	});

	describe('routeToken', () => {
		it('should return null when no token in route', () => {
			mockPage.reset();

			expect(get(routeToken)).toBeNull();
		});

		it('should return token when token is in route', () => {
			mockPage.mock({ token: 'token-1' });

			expect(get(routeToken)).toBe('token-1');
		});

		it('should change when token in route changes', () => {
			mockPage.mock({ token: 'token-1' });

			expect(get(routeToken)).toBe('token-1');

			mockPage.mock({ token: 'token-2' });

			expect(get(routeToken)).toBe('token-2');

			mockPage.reset();

			expect(get(routeToken)).toBeNull();
		});
	});

	describe('routeNetwork', () => {
		it('should return null when no network in route', () => {
			mockPage.reset();

			expect(get(routeNetwork)).toBeNull();
		});

		it('should return network when network is in route', () => {
			mockPage.mock({ network: 'network-1' });

			expect(get(routeNetwork)).toBe('network-1');
		});

		it('should change when network in route changes', () => {
			mockPage.mock({ network: 'network-1' });

			expect(get(routeNetwork)).toBe('network-1');

			mockPage.mock({ network: 'network-2' });

			expect(get(routeNetwork)).toBe('network-2');

			mockPage.reset();

			expect(get(routeNetwork)).toBeNull();
		});
	});

	describe('routeNftNetwork', () => {
		it('should return undefined when no networkId in params', () => {
			mockPage.reset();

			expect(get(routeNftNetwork)).toBeUndefined();
		});

		it('should return networkId when networkId is in params', () => {
			mockPage.mockDynamicRoutes({ networkId: 'network-1' });

			expect(get(routeNftNetwork)).toBe('network-1');
		});

		it('should change when networkId in params changes', () => {
			mockPage.mockDynamicRoutes({ networkId: 'network-1' });

			expect(get(routeNftNetwork)).toBe('network-1');

			mockPage.mockDynamicRoutes({ networkId: 'network-2' });

			expect(get(routeNftNetwork)).toBe('network-2');

			mockPage.reset();

			expect(get(routeNftNetwork)).toBeUndefined();
		});
	});

	describe('routeCollection', () => {
		it('should return undefined when no collectionId in params', () => {
			mockPage.reset();

			expect(get(routeCollection)).toBeUndefined();
		});

		it('should return collectionId when collectionId is in params', () => {
			mockPage.mockDynamicRoutes({ collectionId: 'collection-1' });

			expect(get(routeCollection)).toBe('collection-1');
		});

		it('should change when collectionId in params changes', () => {
			mockPage.mockDynamicRoutes({ collectionId: 'collection-1' });

			expect(get(routeCollection)).toBe('collection-1');

			mockPage.mockDynamicRoutes({ collectionId: 'collection-2' });

			expect(get(routeCollection)).toBe('collection-2');

			mockPage.reset();

			expect(get(routeCollection)).toBeUndefined();
		});
	});

	describe('routeNft', () => {
		it('should return undefined when no nftId in params', () => {
			mockPage.reset();

			expect(get(routeNft)).toBeUndefined();
		});

		it('should return nftId when nftId is in params', () => {
			mockPage.mockDynamicRoutes({ nftId: 'nft-1' });

			expect(get(routeNft)).toBe('nft-1');
		});

		it('should change when nftId in params changes', () => {
			mockPage.mockDynamicRoutes({ nftId: 'nft-1' });

			expect(get(routeNft)).toBe('nft-1');

			mockPage.mockDynamicRoutes({ nftId: 'nft-2' });

			expect(get(routeNft)).toBe('nft-2');

			mockPage.reset();

			expect(get(routeNft)).toBeUndefined();
		});
	});
});
