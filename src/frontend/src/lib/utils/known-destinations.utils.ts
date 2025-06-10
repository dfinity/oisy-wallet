import type { Address } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { KnownDestination, KnownDestinations } from '$lib/types/transactions';
import { getCaseSensitiveness } from '$lib/utils/address.utils';

export const getKnownDestination = <T extends Address>({
	knownDestinations,
	address,
	networkId
}: {
	knownDestinations: KnownDestinations;
	address: T;
	networkId: NetworkId | undefined;
}): KnownDestination | undefined => {
	const isCaseSensitive = getCaseSensitiveness({ networkId });

	if (isCaseSensitive) {
		return knownDestinations[address];
	}

	const knownDestinationsLowerCase: KnownDestinations = Object.fromEntries(
		Object.entries(knownDestinations).map(([key, value]) => [key.toLowerCase(), value])
	);

	return knownDestinationsLowerCase[address.toLowerCase()];
};
