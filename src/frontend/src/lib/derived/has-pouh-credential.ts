import { userProfileStore } from '$lib/stores/settings.store';
import { hasPouhCredential } from '$lib/utils/credentials.utils';
import { derived, type Readable } from 'svelte/store';

export const userHasPouhCredential: Readable<boolean | undefined> = derived(
	[userProfileStore],
	([$profile]) => hasPouhCredential($profile)
);
