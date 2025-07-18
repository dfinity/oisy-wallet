import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK
} from '$env/networks/networks.sol.env';
import * as appContants from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { defineEnabledNetworks } from '$lib/utils/networks.utils';

describe('networks.utils', () => {
	describe('defineEnabledNetworks', () => {
		const mainnetNetworks: Network[] = [SOLANA_MAINNET_NETWORK];
		const testnetNetworks: Network[] = [SOLANA_DEVNET_NETWORK];
		const localNetworks: Network[] = [SOLANA_LOCAL_NETWORK];

		const networks: Network[] = [...mainnetNetworks, ...testnetNetworks, ...localNetworks];

		const mapUserNetworks = ({
			enabledNetworks = networks,
			disabledNetworks = []
		}: {
			enabledNetworks?: Network[];
			disabledNetworks?: Network[];
		}): UserNetworks => ({
			...enabledNetworks.reduce<UserNetworks>(
				(acc, { id, env }) => ({ ...acc, [id]: { enabled: true, isTestnet: env === 'testnet' } }),
				{}
			),
			...disabledNetworks.reduce<UserNetworks>(
				(acc, { id, env }) => ({ ...acc, [id]: { enabled: false, isTestnet: env === 'testnet' } }),
				{}
			)
		});

		const userNetworks: UserNetworks = mapUserNetworks({});

		const mockBaseParams = {
			$testnetsEnabled: false,
			$userNetworks: userNetworks,
			mainnetFlag: true,
			mainnetNetworks,
			testnetNetworks,
			localNetworks
		};

		beforeEach(() => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValue(false);
		});

		describe('when testnets are disabled', () => {
			const mockParams = { ...mockBaseParams, $testnetsEnabled: false };

			it('should return only mainnet networks by default', () => {
				expect(defineEnabledNetworks(mockParams)).toEqual(mainnetNetworks);
			});

			it('should return an empty array when mainnet is disabled', () => {
				expect(defineEnabledNetworks({ ...mockParams, mainnetFlag: false })).toEqual([]);
			});

			it('should return an empty array when all networks are disabled by the user', () => {
				expect(defineEnabledNetworks({ ...mockParams, $userNetworks: {} })).toEqual([]);
			});

			it('should return an empty array when mainnet networks are disabled by the user', () => {
				expect(
					defineEnabledNetworks({
						...mockParams,
						$userNetworks: mapUserNetworks({ disabledNetworks: mainnetNetworks })
					})
				).toEqual([]);
			});

			it('should return an empty array when no mainnet network is provided', () => {
				expect(defineEnabledNetworks({ ...mockParams, mainnetNetworks: [] })).toEqual([]);
			});

			it('should ignore the local networks when they are enabled', () => {
				vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValueOnce(false);

				expect(defineEnabledNetworks(mockParams)).toEqual(mainnetNetworks);
			});
		});

		describe('when testnets are enabled', () => {
			const mockParams = { ...mockBaseParams, $testnetsEnabled: true };

			it('should return mainnet and testnet networks', () => {
				expect(defineEnabledNetworks(mockParams)).toEqual([...mainnetNetworks, ...testnetNetworks]);
			});

			it('should return only testnet networks when mainnet disabled', () => {
				expect(defineEnabledNetworks({ ...mockParams, mainnetFlag: false })).toEqual(
					testnetNetworks
				);
			});

			it('should return an empty array when all networks are disabled by the user', () => {
				expect(defineEnabledNetworks({ ...mockParams, $userNetworks: {} })).toEqual([]);
			});

			it('should return only mainnet networks when testnet disabled by the user', () => {
				expect(
					defineEnabledNetworks({
						...mockParams,
						$userNetworks: mapUserNetworks({ disabledNetworks: testnetNetworks })
					})
				).toEqual(mainnetNetworks);
			});

			it('should return only testnet networks when mainnet disabled by the user', () => {
				expect(
					defineEnabledNetworks({
						...mockParams,
						$userNetworks: mapUserNetworks({ disabledNetworks: mainnetNetworks })
					})
				).toEqual(testnetNetworks);
			});

			it('should return only mainnet networks when no testnet network is provided', () => {
				const { testnetNetworks: _, ...params } = mockParams;

				expect(defineEnabledNetworks(params)).toEqual(mainnetNetworks);
			});

			describe('when local networks are enabled', () => {
				beforeEach(() => {
					vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValueOnce(true);
				});

				it('should return all networks', () => {
					expect(defineEnabledNetworks(mockParams)).toEqual([
						...mainnetNetworks,
						...testnetNetworks,
						...localNetworks
					]);
				});

				it('should return only testnet and local networks when mainnet disabled', () => {
					expect(defineEnabledNetworks({ ...mockParams, mainnetFlag: false })).toEqual([
						...testnetNetworks,
						...localNetworks
					]);
				});

				it('should return empty array when all networks are disabled by the user', () => {
					expect(defineEnabledNetworks({ ...mockParams, $userNetworks: {} })).toEqual([]);
				});

				it('should return only mainnet and testnet networks when local disabled by the user', () => {
					expect(
						defineEnabledNetworks({
							...mockParams,
							$userNetworks: mapUserNetworks({ disabledNetworks: localNetworks })
						})
					).toEqual([...mainnetNetworks, ...testnetNetworks]);
				});

				it('should return only testnet and local networks when mainnet disabled by the user', () => {
					expect(
						defineEnabledNetworks({
							...mockParams,
							$userNetworks: mapUserNetworks({ disabledNetworks: mainnetNetworks })
						})
					).toEqual([...testnetNetworks, ...localNetworks]);
				});

				it('should return only mainnet and local networks when testnet disabled by the user', () => {
					expect(
						defineEnabledNetworks({
							...mockParams,
							$userNetworks: mapUserNetworks({ disabledNetworks: testnetNetworks })
						})
					).toEqual([...mainnetNetworks, ...localNetworks]);
				});

				it('should return only mainnet and testnet networks when no local network is provided', () => {
					const { localNetworks: _, ...params } = mockParams;

					expect(defineEnabledNetworks(params)).toEqual([...mainnetNetworks, ...testnetNetworks]);
				});
			});
		});
	});
});
