import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	parseIcrc7CollectionDeepLink,
	resolveIcrc7CollectionDeepLinkAction
} from '$icp/services/icrc7-deep-link.services';
import { COLLECTION_PARAM, NETWORK_PARAM } from '$lib/constants/routes.constants';
import { mockIcrc7CanisterId, mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';
import { nonNullish } from '@dfinity/utils';

describe('icrc7-deep-link.services', () => {
	const urlWithParams = ({
		collection,
		network
	}: {
		collection?: string;
		network?: string;
	}): URL => {
		const url = new URL('https://oisy.com/nfts/');

		if (nonNullish(collection)) {
			url.searchParams.set(COLLECTION_PARAM, collection);
		}

		if (nonNullish(network)) {
			url.searchParams.set(NETWORK_PARAM, network);
		}

		return url;
	};

	describe('parseIcrc7CollectionDeepLink', () => {
		it('should parse a valid ICP collection deep link', () => {
			expect(
				parseIcrc7CollectionDeepLink({
					url: urlWithParams({ collection: mockIcrc7CanisterId, network: 'ICP' })
				})
			).toEqual({
				canisterId: mockIcrc7CanisterId,
				networkId: ICP_NETWORK_ID
			});
		});

		it('should return undefined when collection is missing', () => {
			expect(
				parseIcrc7CollectionDeepLink({ url: urlWithParams({ network: 'ICP' }) })
			).toBeUndefined();
		});

		it('should return undefined when collection is not a canister id', () => {
			expect(
				parseIcrc7CollectionDeepLink({
					url: urlWithParams({ collection: 'not-a-canister', network: 'ICP' })
				})
			).toBeUndefined();
		});

		it('should return undefined when network is missing', () => {
			expect(
				parseIcrc7CollectionDeepLink({
					url: urlWithParams({ collection: mockIcrc7CanisterId })
				})
			).toBeUndefined();
		});

		it('should return undefined when network is not ICP', () => {
			expect(
				parseIcrc7CollectionDeepLink({
					url: urlWithParams({ collection: mockIcrc7CanisterId, network: 'ETH' })
				})
			).toBeUndefined();
		});
	});

	describe('resolveIcrc7CollectionDeepLinkAction', () => {
		const enabledToken = { ...mockValidIcrc7Token, enabled: true };
		const disabledToken = { ...mockValidIcrc7Token, enabled: false };

		it('should return import action when collection is unknown', () => {
			expect(
				resolveIcrc7CollectionDeepLinkAction({
					url: urlWithParams({ collection: mockIcrc7CanisterId, network: 'ICP' }),
					tokens: []
				})
			).toEqual({
				type: 'import',
				canisterId: mockIcrc7CanisterId,
				networkId: ICP_NETWORK_ID
			});
		});

		it('should return enable action when collection is known but disabled', () => {
			expect(
				resolveIcrc7CollectionDeepLinkAction({
					url: urlWithParams({ collection: mockIcrc7CanisterId, network: 'ICP' }),
					tokens: [disabledToken]
				})
			).toEqual({
				type: 'enable',
				token: disabledToken,
				canisterId: mockIcrc7CanisterId,
				networkId: ICP_NETWORK_ID
			});
		});

		it('should return ready action when collection is already enabled', () => {
			expect(
				resolveIcrc7CollectionDeepLinkAction({
					url: urlWithParams({ collection: mockIcrc7CanisterId, network: 'ICP' }),
					tokens: [enabledToken]
				})
			).toEqual({
				type: 'ready',
				token: enabledToken,
				canisterId: mockIcrc7CanisterId,
				networkId: ICP_NETWORK_ID
			});
		});
	});
});
