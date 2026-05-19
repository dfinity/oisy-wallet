import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import { parseIcrc7CollectionDeepLink } from '$icp/services/icrc7-deep-link.services';
import { COLLECTION_PARAM, NETWORK_PARAM } from '$lib/constants/routes.constants';
import { mockIcrc7CanisterId } from '$tests/mocks/icrc7-tokens.mock';
import { nonNullish } from '@dfinity/utils';

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

			if (nonNullish(collection)) {
				url.searchParams.set(COLLECTION_PARAM, collection);
			}

			if (nonNullish(network)) {
				url.searchParams.set(NETWORK_PARAM, network);
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
