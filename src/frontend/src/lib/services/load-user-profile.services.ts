import type { UserProfile } from '$declarations/backend/backend.did';
import { createUserProfile, getUserProfile } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { userProfileStore } from '$lib/stores/settings.store';
import { toastsError } from '$lib/stores/toasts.store';
import { UserProfileNotFoundError } from '$lib/types/errors';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const getUncertifiedProfile = async ({
	identity
}: {
	identity: Identity;
}): Promise<UserProfile | undefined> => {
	try {
		return await getUserProfile({ identity, certified: false });
	} catch (err) {
		if (err instanceof UserProfileNotFoundError) {
			return undefined;
		}
		throw err;
	}
};

const loadCertifiedUserProfile = async ({ identity }: { identity: Identity }): Promise<void> => {
	try {
		const profile = await getUserProfile({ identity, certified: true });
		userProfileStore.set({ key: 'user-profile', value: profile });
	} catch (err) {
		// We ignore the error because this is a background task.
		console.error('Failed to load certified user profile.', err);
	}
};

export const loadUserProfile = async ({ identity }: { identity: Identity }): Promise<void> => {
	try {
		let profile = await getUncertifiedProfile({ identity });
		if (isNullish(profile)) {
			profile = await createUserProfile({ identity });
		} else {
			// We don't wait for this to complete because we want a smooth UX
			// the uncertified data is enough for the user to start using the app.
			loadCertifiedUserProfile({ identity });
		}
		userProfileStore.set({ key: 'user-profile', value: profile });
	} catch (err) {
		const { settings } = get(i18n);
		toastsError({
			msg: { text: settings.error.loading_profile }
		});
		console.error('Failed to load user profile.', err);
	}
};
