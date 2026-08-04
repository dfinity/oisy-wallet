import type { NetworkId } from '$lib/types/network';
import { derived, writable, type Readable } from 'svelte/store';

export interface FailedAddress {
	networkId: NetworkId;
	// Whether the user has already been told about this chain. Address loading is retried by
	// `Loader.svelte` whenever a nullish address meets an enabled network, so without this flag a
	// permanently failing chain would re-toast on every retry.
	reported: boolean;
}

export interface FailedAddressesStore extends Readable<FailedAddress[]> {
	add: (networkId: NetworkId) => void;
	remove: (networkId: NetworkId) => void;
	markReported: (networkIds: NetworkId[]) => void;
	reset: () => void;
}

/**
 * The chains whose address could not be derived.
 *
 * Single source of truth for the three things that need to agree: the one aggregated toast, the
 * `app_error` event, and any UI that has to present a chain as unavailable. Both entry points into
 * address loading — `loadAddresses` at startup and the `Loader.svelte` effect — write here, which
 * is why the aggregation cannot simply live in one of them.
 *
 * A chain is dropped from the set as soon as its address loads, so a chain that recovers stops
 * being treated as failed without a page reload.
 */
const initFailedAddressesStore = (): FailedAddressesStore => {
	const { subscribe, update, set } = writable<FailedAddress[]>([]);

	return {
		subscribe,

		add: (networkId: NetworkId) => {
			update((failed) =>
				// Keep the existing entry, so an already-reported chain is not reported again by a retry.
				failed.some(({ networkId: id }) => id === networkId)
					? failed
					: [...failed, { networkId, reported: false }]
			);
		},

		remove: (networkId: NetworkId) => {
			update((failed) => failed.filter(({ networkId: id }) => id !== networkId));
		},

		markReported: (networkIds: NetworkId[]) => {
			update((failed) =>
				failed.map((entry) =>
					networkIds.includes(entry.networkId) ? { ...entry, reported: true } : entry
				)
			);
		},

		reset: () => {
			set([]);
		}
	};
};

export const failedAddresses = initFailedAddressesStore();

/**
 * The chains to present as unavailable rather than still loading.
 *
 * Without this, a permanently failed chain is indistinguishable from a slow one — the receive
 * section keeps showing a loading skeleton forever, which reads as "almost there" instead of
 * "this will not load".
 */
export const failedAddressNetworkIds: Readable<NetworkId[]> = derived(
	[failedAddresses],
	([$failedAddresses]) => $failedAddresses.map(({ networkId }) => networkId)
);
