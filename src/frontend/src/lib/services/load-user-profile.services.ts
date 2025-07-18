import type { UserProfile } from '$declarations/backend/backend.did';
import { createUserProfile, getUserProfile } from '$lib/api/backend.api';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { UserProfileNotFoundError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const queryProfile = async ({
	identity,
	certified
}: {
	identity: OptionIdentity;
	certified: boolean;
}): Promise<UserProfile> => {
	const response = await getUserProfile({
		identity,
		certified,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
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
	identity: OptionIdentity;
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
	identity: OptionIdentity;
}): Promise<void> => {
	try {
		const profile = await queryProfile({ identity, certified: true });
		userProfileStore.set({ certified: true, profile });
	} catch (err) {
		// We ignore the error because this is a background task.
		console.error('Failed to load certified user profile.', err);
	}
};

export const loadUserProfile = async ({
	identity,
	reload = true
}: {
	identity: OptionIdentity;
	reload?: boolean;
}): Promise<ResultSuccess> => {
	// We just want to verify that the store is empty, without being interested in the data.
	// So we fetch it imperatively, instead of passing as parameter.
	// If it is not empty, and we don't want to reload, we can return early.
	// In any case, if `reload` is true, we will always fetch the profile.
	if (nonNullish(get(userProfileStore)) && !reload) {
		return { success: true };
	}

	try {
		let profile = await queryUnsafeProfile({ identity });
		if (isNullish(profile)) {
			profile = await createUserProfile({
				identity,
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			});
			userProfileStore.set({ certified: true, profile });
		} else {
			// We set the store before the call to load the certified profile.
			userProfileStore.set({ certified: false, profile });
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
		return { success: false };
	}

	return { success: true };
};
