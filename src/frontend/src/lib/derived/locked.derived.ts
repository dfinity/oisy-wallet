import { authNotSignedIn } from '$lib/derived/auth.derived';
import { authLocked } from '$lib/stores/locked.store';
import { derived, type Readable } from 'svelte/store';

export const isLocked: Readable<boolean> = derived([authLocked], ([$authLocked]) => $authLocked);

export const isAuthLocked: Readable<boolean> = derived(
	[authNotSignedIn, authLocked],
	([$authNotSignedIn, $authLocked]) => $authNotSignedIn && $authLocked
);
