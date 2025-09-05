import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { KnownDestination, KnownDestinations } from '$lib/types/transactions';
import { getRecordValueByCaseSensitivity } from '$lib/utils/record.utils';

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
