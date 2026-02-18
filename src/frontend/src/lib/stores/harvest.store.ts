import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import type { Erc4626ContractAddress } from '$eth/types/erc4626';
import type { HarvestVault } from '$lib/types/harvest';
import { formatStakeApyNumber } from '$lib/utils/format.utils';
import { nonNullish } from '@dfinity/utils';
import { writable, type Readable } from 'svelte/store';

export type HarvestVaultsStoreData = Record<Erc4626ContractAddress, { estimatedApy: string }>;

export interface HarvestVaultsStore extends Readable<HarvestVaultsStoreData> {
	set: (vaults: HarvestVault[]) => void;
	reset: () => void;
}

const initHarvestVaultsStore = (): HarvestVaultsStore => {
	const defaultStoreValue = {};
	const { subscribe, set } = writable<HarvestVaultsStoreData>(defaultStoreValue);

	const knownVaultAddresses = new Set(ERC4626_TOKENS.map(({ address }) => address.toLowerCase()));

	return {
		subscribe,
		set: (vaults: HarvestVault[]) => {
			const data = vaults.reduce<HarvestVaultsStoreData>((acc, vault) => {
				if (
					knownVaultAddresses.has(vault.vaultAddress.toLowerCase()) &&
					nonNullish(vault.estimatedApy)
				) {
					acc[vault.vaultAddress] = {
						estimatedApy: formatStakeApyNumber(Number(vault.estimatedApy))
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
