import { routeNetwork } from '$lib/derived/nav.derived';
import type { NetworkId } from '$lib/types/network';
import { parseNetworkId } from '$lib/validation/network.validation';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const pageNetworkId: Readable<NetworkId | undefined> = derived(
	[routeNetwork],
	([$routeNetwork]) => (nonNullish($routeNetwork) ? parseNetworkId($routeNetwork) : undefined)
);
