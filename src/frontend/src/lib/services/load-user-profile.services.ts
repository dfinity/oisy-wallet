import type { UserProfile } from '$declarations/backend/backend.did';
import { createUserProfile, getUserProfile } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { userProfileStore } from '$lib/stores/settings.store';
import { toastsError } from '$lib/stores/toasts.store';
import { UserProfileNotFoundError } from '$lib/types/errors';
import type { Identity } from '@dfinity/agent';
import { isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const queryProfile = async ({
	identity,
	certified
}: {
	identity: Identity;
	certified: boolean;
}): Promise<UserProfile> => {
	const response = await getUserProfile({ identity, certified });
	if ('Ok' in response) {
		return response.Ok;
	}
	const err = response.Err;
	if ('NotFound' in err) {
		throw new UserProfileNotFoundError();
	}
	throw new Error('Unknown error');
};

const queryUnsafeProfile = async ({
	identity
}: {
	identity: Identity;
}): Promise<UserProfile | undefined> => {
	try {
		return await queryProfile({ identity, certified: false });
	} catch (err) {
		if (err instanceof UserProfileNotFoundError) {
			return undefined;
		}
		throw err;
	}
};

export const loadCertifiedUserProfile = async ({
	identity
}: {
	identity: Identity;
}): Promise<void> => {
	try {
		const profile = await queryProfile({ identity, certified: true });
		userProfileStore.set({ key: 'user-profile', value: profile });
	} catch (err) {
		// We ignore the error because this is a background task.
		console.error('Failed to load certified user profile.', err);
	}
};

export const loadUserProfile = async ({ identity }: { identity: Identity }): Promise<void> => {
	try {
		let profile = await queryUnsafeProfile({ identity });
		if (isNullish(profile)) {
			profile = await createUserProfile({ identity });
			userProfileStore.set({ key: 'user-profile', value: profile });
		} else {
			// We set the store before the call to load the certified profile.
			userProfileStore.set({ key: 'user-profile', value: profile });
			// We don't wait for this to complete because we want a smooth UX
			// the uncertified data is enough for the user to start using the app.
			loadCertifiedUserProfile({ identity });
		}
	} catch (err: unknown) {
		const { settings } = get(i18n);
		toastsError({
			msg: { text: settings.error.loading_profile },
			err
		});
	}
};
