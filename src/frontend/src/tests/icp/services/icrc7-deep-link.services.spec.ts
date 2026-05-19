import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	ICRC7_COLLECTION_NETWORK_QUERY_PARAM,
	ICRC7_COLLECTION_QUERY_PARAM,
	parseIcrc7CollectionDeepLink
} from '$icp/services/icrc7-deep-link.services';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';

describe('icrc7-deep-link.services', () => {
	describe('parseIcrc7CollectionDeepLink', () => {
		const urlWithParams = ({
			collection,
			network
		}: {
			collection?: string;
			network?: string;
		}): URL => {
			const url = new URL('https://oisy.com/nfts/');

			if (collection !== undefined) {
				url.searchParams.set(ICRC7_COLLECTION_QUERY_PARAM, collection);
			}

			if (network !== undefined) {
				url.searchParams.set(ICRC7_COLLECTION_NETWORK_QUERY_PARAM, network);
			}

			return url;
		};

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
});
