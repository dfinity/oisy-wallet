import { authNotSignedIn } from '$lib/derived/auth.derived';
import { authLocked } from '$lib/utils/locked.utils';
import { derived, type Readable } from 'svelte/store';

export const isAuthLocked: Readable<boolean> = derived(
	[authLocked],
	([$authLocked]) => $authLocked
);

export const shouldShowLockPage: Readable<boolean> = derived(
	[authNotSignedIn, authLocked],
	([$authNotSignedIn, $authLocked]) => $authNotSignedIn && $authLocked
);
