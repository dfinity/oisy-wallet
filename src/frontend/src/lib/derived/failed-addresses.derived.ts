import { networks } from '$lib/derived/networks.derived';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import type { Network, NetworkId } from '$lib/types/network';
import { networksDependingOnFailedAddresses } from '$lib/utils/address.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * Every enabled network that cannot work because its address failed to derive.
 *
 * Spans all recorded failures, including ones already reported to the user — a chain stays
 * unavailable after its toast has been shown, so the UI must keep treating it that way. The toast
 * itself expands only the not-yet-reported failures, which is why it does not read this.
 */
export const failedAddressNetworks: Readable<Network[]> = derived(
	[networks, failedAddresses],
	([$networks, $failedAddresses]) =>
		networksDependingOnFailedAddresses({
			networks: $networks,
			failedNetworkIds: $failedAddresses.map(({ networkId }) => networkId)
		})
);

export const failedAddressNetworkIds: Readable<NetworkId[]> = derived(
	[failedAddressNetworks],
	([$failedAddressNetworks]) => $failedAddressNetworks.map(({ id }) => id)
);
