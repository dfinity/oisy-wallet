import {
	CustomEvmNetworkInputSchema,
	CustomEvmNetworkSchema,
	PersistedCustomEvmNetworkListSchema
} from '$eth/schema/custom-network.schema';
import type { CustomEvmNetwork, PersistedCustomEvmNetwork } from '$eth/types/custom-network';
import type { NetworkId } from '$lib/types/network';
import { del as delStorage, get as getStorage, set as setStorage } from '$lib/utils/storage.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { writable, type Readable } from 'svelte/store';

export const CUSTOM_EVM_NETWORKS_STORAGE_KEY = 'custom-evm-networks';

const networkIdCache = new Map<string, NetworkId>();

const toNetworkId = (chainId: bigint): NetworkId => {
	const key = chainId.toString();
	const cached = networkIdCache.get(key);
	if (cached !== undefined) {
		return cached;
	}
	const id = parseNetworkId(`custom-evm:${key}`);
	networkIdCache.set(key, id);
	return id;
};

const toPersisted = (network: CustomEvmNetwork): PersistedCustomEvmNetwork => ({
	chainId: network.chainId.toString(),
	name: network.name,
	rpcUrl: network.rpcUrl,
	currencySymbol: network.currencySymbol,
	explorerUrl: network.explorerUrl,
	iconUrl: network.iconUrl,
	env: network.env
});

const fromPersisted = (persisted: PersistedCustomEvmNetwork): CustomEvmNetwork => {
	const chainId = BigInt(persisted.chainId);
	return {
		id: toNetworkId(chainId),
		chainId,
		name: persisted.name,
		rpcUrl: persisted.rpcUrl,
		currencySymbol: persisted.currencySymbol,
		explorerUrl: persisted.explorerUrl,
		iconUrl: persisted.iconUrl,
		env: persisted.env
	};
};

const dedupeByChainId = (networks: PersistedCustomEvmNetwork[]): PersistedCustomEvmNetwork[] => {
	const seen = new Set<string>();
	return networks.filter(({ chainId }) => {
		if (seen.has(chainId)) {
			return false;
		}
		seen.add(chainId);
		return true;
	});
};

const loadFromStorage = (): CustomEvmNetwork[] => {
	const raw = getStorage<unknown>({ key: CUSTOM_EVM_NETWORKS_STORAGE_KEY });
	const parsed = PersistedCustomEvmNetworkListSchema.safeParse(raw ?? []);
	if (!parsed.success) {
		return [];
	}
	return dedupeByChainId(parsed.data).map(fromPersisted);
};

export type CustomEvmNetworkInput = Omit<CustomEvmNetwork, 'id'>;

export type CustomEvmNetworkPatch = Partial<Omit<CustomEvmNetwork, 'id' | 'chainId'>>;

export interface CustomEvmNetworksStore extends Readable<CustomEvmNetwork[]> {
	add: (network: CustomEvmNetworkInput) => void;
	update: (params: { chainId: bigint; patch: CustomEvmNetworkPatch }) => void;
	remove: (params: { chainId: bigint }) => void;
	reset: () => void;
}

export const initCustomEvmNetworksStore = (): CustomEvmNetworksStore => {
	const {
		subscribe,
		update: updateWritable,
		set
	} = writable<CustomEvmNetwork[]>(loadFromStorage());

	const persist = (list: CustomEvmNetwork[]) => {
		setStorage<PersistedCustomEvmNetwork[]>({
			key: CUSTOM_EVM_NETWORKS_STORAGE_KEY,
			value: list.map(toPersisted)
		});
	};

	return {
		subscribe,
		add: (input) => {
			updateWritable((current) => {
				if (current.some(({ chainId }) => chainId === input.chainId)) {
					throw new Error(
						`A custom EVM network with chainId ${input.chainId} has already been added.`
					);
				}
				// Validate the raw input (without `id`) so that invalid chainIds
				// don't populate the networkIdCache. The derived `id` is deterministic
				// given a valid chainId, so it does not require a second pass.
				const parsed = CustomEvmNetworkInputSchema.safeParse(input);
				if (!parsed.success) {
					throw new Error(`Invalid custom EVM network: ${parsed.error.message}`);
				}
				const entry: CustomEvmNetwork = { ...parsed.data, id: toNetworkId(parsed.data.chainId) };
				const next: CustomEvmNetwork[] = [...current, entry];
				persist(next);
				return next;
			});
		},
		update: ({ chainId, patch }) => {
			updateWritable((current) => {
				const index = current.findIndex((n) => n.chainId === chainId);
				if (index === -1) {
					throw new Error(`No custom EVM network with chainId ${chainId} exists; cannot update.`);
				}
				const existing = current[index];
				const merged: CustomEvmNetwork = {
					...existing,
					...patch,
					id: existing.id,
					chainId: existing.chainId
				};
				const parsed = CustomEvmNetworkSchema.safeParse(merged);
				if (!parsed.success) {
					throw new Error(`Invalid custom EVM network update: ${parsed.error.message}`);
				}
				const next = [...current];
				next[index] = parsed.data;
				persist(next);
				return next;
			});
		},
		remove: ({ chainId }) => {
			updateWritable((current) => {
				const next = current.filter((n) => n.chainId !== chainId);
				if (next.length === current.length) {
					return current;
				}
				persist(next);
				return next;
			});
		},
		reset: () => {
			delStorage({ key: CUSTOM_EVM_NETWORKS_STORAGE_KEY });
			set([]);
		}
	};
};

export const customEvmNetworksStore: CustomEvmNetworksStore = initCustomEvmNetworksStore();
