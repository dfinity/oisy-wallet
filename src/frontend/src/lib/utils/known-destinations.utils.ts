import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { KnownDestination, KnownDestinations } from '$lib/types/transactions';
import { getRecordValueByCaseSensitivity } from '$lib/utils/record.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const getKnownDestination = ({
	knownDestinations,
	address,
	networkId
}: {
	knownDestinations: KnownDestinations;
	address: Address;
	networkId: NetworkId;
}): KnownDestination | undefined =>
	getRecordValueByCaseSensitivity({
		record: knownDestinations,
		address,
		networkId
	});

/**
 * Tells whether the user has never sent to an address before.
 *
 * "Used before" means exactly what the Recently Used list of the send flow shows: an outgoing
 * transfer of a non-zero amount to that address on the same network. Sends of a zero amount do
 * not count, since anyone can put those in the user's history.
 *
 * Being saved as a contact does not make an address used before: an address can be saved, or
 * received from, without ever having been sent to.
 *
 * It fails open: without the known destinations of the network, no address is reported as
 * first-time.
 */
export const isFirstTimeDestination = ({
	destination,
	networkId,
	knownDestinations
}: {
	destination: Address;
	networkId: NetworkId | undefined;
	knownDestinations: KnownDestinations | undefined;
}): boolean =>
	nonNullish(networkId) &&
	nonNullish(knownDestinations) &&
	isNullish(getKnownDestination({ knownDestinations, address: destination, networkId }));
