import { authNotSignedIn } from '$lib/derived/auth.derived';
import { authLocked, type AuthLockReason } from '$lib/stores/locked.store';
import { derived, type Readable } from 'svelte/store';

export const isLocked: Readable<boolean> = derived(
	[authLocked],
	([$authLocked]) => $authLocked !== false
);

export const authLockReason: Readable<AuthLockReason | undefined> = derived(
	[authLocked],
	([$authLocked]) =>
		$authLocked === false ? undefined : $authLocked === true ? 'lock' : $authLocked
);

export const isAuthLocked: Readable<boolean> = derived(
	[authNotSignedIn, isLocked],
	([$authNotSignedIn, $isLocked]) => $authNotSignedIn && $isLocked
);
