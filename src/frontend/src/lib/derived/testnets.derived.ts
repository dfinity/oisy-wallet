import { userSettings } from '$lib/derived/user-profile.derived';
import { derived, type Readable } from 'svelte/store';

export const testnets: Readable<boolean> = derived(
	[userSettings],
	([$userSettings]) => $userSettings?.networks.testnets.show_testnets ?? false
);
