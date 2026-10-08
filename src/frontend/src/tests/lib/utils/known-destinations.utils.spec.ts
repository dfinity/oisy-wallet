import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import type { KnownDestinations } from '$lib/types/transactions';
import { getKnownDestination, isFirstTimeDestination } from '$lib/utils/known-destinations.utils';
import { mockEthAddress, mockEthAddress2 } from '$tests/mocks/eth.mock';

describe('known-destinations.utils', () => {
	const knownDestinations: KnownDestinations = {
		[mockEthAddress]: {
			address: mockEthAddress,
			amounts: [{ value: 1n, token: ETHEREUM_TOKEN }],
			timestamp: 1234567890
		}
	};

	describe('getKnownDestination', () => {
		it('finds a known destination regardless of the address casing on a case-insensitive network', () => {
			expect(
				getKnownDestination({
					knownDestinations,
					address: mockEthAddress.toUpperCase(),
					networkId: ETHEREUM_NETWORK_ID
				})
			).toEqual(knownDestinations[mockEthAddress]);
		});

		it('returns undefined for an address that was never sent to', () => {
			expect(
				getKnownDestination({
					knownDestinations,
					address: mockEthAddress2,
					networkId: ETHEREUM_NETWORK_ID
				})
			).toBeUndefined();
		});
	});

	describe('isFirstTimeDestination', () => {
		it('is true for an address that was never sent to', () => {
			expect(
				isFirstTimeDestination({
					destination: mockEthAddress2,
					networkId: ETHEREUM_NETWORK_ID,
					knownDestinations
				})
			).toBeTruthy();
		});

		it('is true for an address that was never sent to, even with an empty history', () => {
			expect(
				isFirstTimeDestination({
					destination: mockEthAddress2,
					networkId: ETHEREUM_NETWORK_ID,
					knownDestinations: {}
				})
			).toBeTruthy();
		});

		it('is false for an address that was sent to before', () => {
			expect(
				isFirstTimeDestination({
					destination: mockEthAddress,
					networkId: ETHEREUM_NETWORK_ID,
					knownDestinations
				})
			).toBeFalsy();
		});

		it('is false for an address that was sent to before, with a different casing', () => {
			expect(
				isFirstTimeDestination({
					destination: mockEthAddress.toUpperCase(),
					networkId: ETHEREUM_NETWORK_ID,
					knownDestinations
				})
			).toBeFalsy();
		});

		it('fails open when the known destinations are not available', () => {
			expect(
				isFirstTimeDestination({
					destination: mockEthAddress2,
					networkId: ETHEREUM_NETWORK_ID,
					knownDestinations: undefined
				})
			).toBeFalsy();
		});

		it('fails open when the network is not known', () => {
			expect(
				isFirstTimeDestination({
					destination: mockEthAddress2,
					networkId: undefined,
					knownDestinations: {}
				})
			).toBeFalsy();
		});
	});
});
