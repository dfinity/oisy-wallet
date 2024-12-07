import type { Settings } from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { Option } from '$lib/types/utils';
import { fromNullable, isNullish, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userSettings: Readable<Option<Settings>> = derived(
	[userProfileStore],
	([$userProfile]) =>
		nonNullish($userProfile) ? fromNullable($userProfile.profile.settings) : undefined
);

export const userSettingsLoaded: Readable<boolean> = derived(
	[userProfileStore, userSettings],
	([$userProfile, $userSettings]) =>
		nonNullish($userSettings) ||
		(nonNullish($userProfile) && isNullish(fromNullable($userProfile.profile.settings)))
);
