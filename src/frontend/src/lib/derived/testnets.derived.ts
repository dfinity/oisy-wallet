import { userNetworksSettings } from '$lib/derived/user-networks.derived';
import { derived, type Readable } from 'svelte/store';

export const testnets: Readable<boolean> = derived(
	[userNetworksSettings],
	([$userNetworksSettings]) => $userNetworksSettings?.testnets.show_testnets ?? false
);
