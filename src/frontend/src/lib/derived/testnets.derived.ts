import { userSettingsNetworks } from '$lib/derived/user-profile.derived';
import { derived, type Readable } from 'svelte/store';

export const testnetsEnabled: Readable<boolean> = derived(
	[userSettingsNetworks],
	([$userNetworksSettings]) => $userNetworksSettings?.testnets.show_testnets ?? false
);
