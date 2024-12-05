import { authStore } from '$lib/stores/auth.store';
import type { OptionIdentity } from '$lib/types/identity';
import { derived, type Readable } from 'svelte/store';

export const authSignedIn: Readable<boolean> = derived(
	authStore,
	({ identity }) => identity !== null && identity !== undefined
);

export const authNotSignedIn: Readable<boolean> = derived(
	authSignedIn,
	($authSignedIn) => !$authSignedIn
);

export const authIdentity: Readable<OptionIdentity> = derived(
	authStore,
	({ identity }) => identity
);
