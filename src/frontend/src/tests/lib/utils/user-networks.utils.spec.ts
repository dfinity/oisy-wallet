import { ICP_NETWORK_ID } from '$env/networks/networks.icp.env';
import {
	isUserNetworkEnabled,
	mapUserNetworks,
	resolveNetworkSettingsKeys
} from '$lib/utils/user-networks.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { mockUserNetworks, mockUserNetworksComplete } from '$tests/mocks/user-networks.mock';
import { mockUserNetworksMap } from '$tests/mocks/user-profile.mock';

describe('user-networks.utils', () => {
	describe('mapUserNetworks', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should convert UserNetworks to array of [NetworkSettingsFor, NetworkSettings]', () => {
			expect(mapUserNetworks(mockUserNetworks)).toEqual(mockUserNetworksMap);
		});

		it('should ignore unknown network IDs and log them to console', () => {
			const unknownNetworkId = parseNetworkId('unknownNetworkId');
			const userNetworks = {
				...mockUserNetworks,
				[unknownNetworkId]: { enabled: true, isTestnet: false }
			};

			expect(mapUserNetworks(userNetworks)).toEqual(mockUserNetworksMap);

			expect(console.warn).toHaveBeenCalledOnce();
			expect(console.warn).toHaveBeenNthCalledWith(
				1,
				`Unknown networkId: ${unknownNetworkId.description}`
			);
		});

		it('should handle empty UserNetworks', () => {
			expect(mapUserNetworks({})).toEqual([]);
		});

		it('should be able to map all networks', () => {
			expect(() => mapUserNetworks(mockUserNetworksComplete)).not.toThrow();

			expect(console.warn).not.toHaveBeenCalled();
			expect(console.error).not.toHaveBeenCalled();
		});
	});

	describe('isUserNetworkEnabled', () => {
		it('should return true if network is enabled', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: {
						...mockUserNetworks,
						[ICP_NETWORK_ID]: { enabled: true, isTestnet: false }
					},
					networkId: ICP_NETWORK_ID
				})
			).toBeTruthy();
		});

		it('should return false if network is disabled', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: {
						...mockUserNetworks,
						[ICP_NETWORK_ID]: { enabled: false, isTestnet: false }
					},
					networkId: ICP_NETWORK_ID
				})
			).toBeFalsy();
		});

		it('should return false if network is not present', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: mockUserNetworks,
					networkId: parseNetworkId('unknownNetworkId')
				})
			).toBeFalsy();
		});

		it('should return false there are no user networks', () => {
			expect(
				isUserNetworkEnabled({
					userNetworks: {},
					networkId: ICP_NETWORK_ID
				})
			).toBeFalsy();
		});
	});

	describe('resolveNetworkSettingsKeys', () => {
		const names = ['InternetComputer', 'SolanaMainnet', 'BitcoinMainnet'] as const;
		const settings = { enabled: true, is_testnet: false };

		it('should resolve hashed keys back to their names', () => {
			const { networks, unresolved } = resolveNetworkSettingsKeys({
				networks: [
					[{ _2986158464_: null }, settings],
					[{ _90402076_: null }, settings]
				],
				names
			});

			expect(networks).toEqual([
				[{ SolanaMainnet: null }, settings],
				[{ InternetComputer: null }, settings]
			]);

			expect(unresolved).toEqual([]);
		});

		// The behaviour the tolerant decode exists for: one unknown network costs that one setting,
		// never the whole record.
		it('should keep the known networks and report only the unknown one', () => {
			const { networks, unresolved } = resolveNetworkSettingsKeys({
				networks: [
					[{ _2986158464_: null }, settings],
					[{ _400215630_: null }, settings]
				],
				names
			});

			expect(networks).toEqual([[{ SolanaMainnet: null }, settings]]);

			expect(unresolved).toEqual(['_400215630_']);
		});

		it('should return empty results for an empty settings list', () => {
			expect(resolveNetworkSettingsKeys({ networks: [], names })).toEqual({
				networks: [],
				unresolved: []
			});
		});
	});
});
