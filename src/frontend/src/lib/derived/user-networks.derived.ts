import type { NetworksSettings } from '$declarations/backend/backend.did';
import { userSettings } from '$lib/derived/user-profile.derived';
import { derived, type Readable } from 'svelte/store';

export const userSettingsNetworks: Readable<NetworksSettings | undefined> = derived(
	[userSettings],
	([$userSettings]) => $userSettings?.networks
);
