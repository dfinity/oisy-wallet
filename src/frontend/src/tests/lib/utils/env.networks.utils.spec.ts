import {
	SOLANA_DEVNET_NETWORK,
	SOLANA_LOCAL_NETWORK,
	SOLANA_MAINNET_NETWORK
} from '$env/networks/networks.sol.env';
import * as appContants from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';

describe('env.networks.utils', () => {
	describe('defineSupportedNetworks', () => {
		const mainnetNetworks: Network[] = [SOLANA_MAINNET_NETWORK];
		const testnetNetworks: Network[] = [SOLANA_DEVNET_NETWORK];
		const localNetworks: Network[] = [SOLANA_LOCAL_NETWORK];

		const mockBaseParams = {
			mainnetFlag: true,
			mainnetNetworks,
			testnetNetworks,
			localNetworks
		};

		beforeEach(() => {
			vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValue(false);
		});

		const mockParams = { ...mockBaseParams, $testnetsEnabled: true };

		it('should return mainnet and testnet networks', () => {
			expect(defineSupportedNetworks(mockParams)).toEqual([...mainnetNetworks, ...testnetNetworks]);
		});

		it('should return only testnet networks when mainnet disabled', () => {
			expect(defineSupportedNetworks({ ...mockParams, mainnetFlag: false })).toEqual(
				testnetNetworks
			);
		});

		it('should return only mainnet networks when no testnet network is provided', () => {
			const { testnetNetworks: _, ...params } = mockParams;

			expect(defineSupportedNetworks(params)).toEqual(mainnetNetworks);
		});

		describe('when local networks are enabled', () => {
			beforeEach(() => {
				vi.spyOn(appContants, 'LOCAL', 'get').mockReturnValueOnce(true);
			});

			it('should return all networks', () => {
				expect(defineSupportedNetworks(mockParams)).toEqual([
					...mainnetNetworks,
					...testnetNetworks,
					...localNetworks
				]);
			});

			it('should return only testnet and local networks when mainnet disabled', () => {
				expect(defineSupportedNetworks({ ...mockParams, mainnetFlag: false })).toEqual([
					...testnetNetworks,
					...localNetworks
				]);
			});

			it('should return only mainnet and testnet networks when no local network is provided', () => {
				const { localNetworks: _, ...params } = mockParams;

				expect(defineSupportedNetworks(params)).toEqual([...mainnetNetworks, ...testnetNetworks]);
			});
		});
	});
});
