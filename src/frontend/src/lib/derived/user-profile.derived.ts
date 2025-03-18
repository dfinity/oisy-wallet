import type { Settings, UserProfile } from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { Option } from '$lib/types/utils';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userProfileLoaded: Readable<boolean> = derived([userProfileStore], ([$userProfile]) =>
	nonNullish($userProfile)
);

export const userProfile: Readable<UserProfile | undefined> = derived(
	[userProfileStore],
	([$userProfile]) => (nonNullish($userProfile) ? $userProfile.profile : undefined)
);

export const userProfileVersion: Readable<bigint | undefined> = derived(
	[userProfile],
	([$userProfile]) => (nonNullish($userProfile) ? fromNullable($userProfile.version) : undefined)
);

export const userSettings: Readable<Option<Settings>> = derived([userProfile], ([$userProfile]) =>
	nonNullish($userProfile) ? fromNullable($userProfile.settings) : undefined
);
