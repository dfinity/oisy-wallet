import { HARVEST_AUTOPILOT_ADDRESSES } from '$eth/constants/harvest-autopilots.constants';
import type { Erc4626ContractAddress } from '$eth/types/erc4626';
import type { HarvestVault } from '$lib/types/harvest';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type HarvestVaultsStoreData = Record<
	Erc4626ContractAddress,
	{ estimatedApy: string; totalValueLocked?: string }
>;

export interface HarvestVaultsStore extends Readable<HarvestVaultsStoreData> {
	set: (vaults: HarvestVault[]) => void;
	reset: () => void;
}

const initHarvestVaultsStore = (): HarvestVaultsStore => {
	const defaultStoreValue = {};
	const { subscribe, set } = writable<HarvestVaultsStoreData>(defaultStoreValue);

	return {
		subscribe,
		set: (vaults: HarvestVault[]) => {
			const data = vaults.reduce<HarvestVaultsStoreData>((acc, vault) => {
				const address = vault.vaultAddress.toLowerCase();

				if (HARVEST_AUTOPILOT_ADDRESSES.includes(address) && nonNullish(vault.estimatedApy)) {
					acc[address] = {
						estimatedApy: formatStakeApyNumber(Number(vault.estimatedApy)),
						...(vault.totalValueLocked && { totalValueLocked: vault.totalValueLocked })
					};
				}

				return acc;
			}, {});

			set(data);
		},
		reset: () => set(defaultStoreValue)
	};
};

export const harvestVaultsStore = initHarvestVaultsStore();
