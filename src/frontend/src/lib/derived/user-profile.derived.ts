import type { Settings, UserProfile } from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { nonNullish } from '@dfinity/utils';
import { fromNullishNullable } from '@dfinity/utils/dist/types/utils/did.utils';
import { derived, type Readable } from 'svelte/store';

export const userProfileLoaded: Readable<boolean> = derived([userProfileStore], ([$userProfile]) =>
	nonNullish($userProfile)
);

export const userProfile: Readable<UserProfile | undefined> = derived(
	[userProfileStore],
	([$userProfile]) => $userProfile?.profile
);

export const userProfileVersion: Readable<bigint | undefined> = derived(
	[userProfile],
	([$userProfile]) => fromNullishNullable($userProfile?.version)
);

export const userSettings: Readable<Settings | undefined> = derived(
	[userProfile],
	([$userProfile]) => fromNullishNullable($userProfile?.settings)
);
