import type { Settings } from '$declarations/backend/backend.did';
import { userProfileStore } from '$lib/stores/user-profile.store';
import type { Option } from '$lib/types/utils';
import { fromNullable, nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const userSettings: Readable<Option<Settings>> = derived(
	[userProfileStore],
	([$userProfile]) =>
		// The user profile may or may not have the settings field.
		// To distinguish between user profile not loaded and missing settings,
		// we use `undefined` for the former and `null` for the latter.
		nonNullish($userProfile) ? (fromNullable($userProfile.profile.settings) ?? null) : undefined
);
