import type { Settings } from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userSettings: Readable<Settings | undefined> = derived(
	[userProfileStore],
	([$userProfile]) =>
		nonNullish($userProfile) ? fromNullable($userProfile.profile.settings) : undefined
);
