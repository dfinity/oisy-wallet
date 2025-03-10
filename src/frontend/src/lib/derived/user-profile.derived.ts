import type { Settings } from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { Option } from '$lib/types/utils';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userProfileLoaded: Readable<boolean> = derived([userProfileStore], ([$userProfile]) =>
	nonNullish($userProfile)
);

export const userSettings: Readable<Option<Settings>> = derived(
	[userProfileStore],
	([$userProfile]) =>
		nonNullish($userProfile) ? fromNullable($userProfile.profile.settings) : undefined
);
