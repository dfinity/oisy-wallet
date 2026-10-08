import type { UserProfile } from '$declarations/backend/backend.did';
import type { Nullish } from '@dfinity/zod-schemas';
import { writable, type Readable } from 'svelte/store';

interface CertifiedUserProfileData {
	profile: UserProfile;
	certified: boolean;
}

// * `undefined` means the store is not loaded yet.
// * `null` means there was an error.
// * `UserProfile` is the data.
export type UserProfileStoreData = Nullish<CertifiedUserProfileData>;

export interface UserProfileStore extends Readable<UserProfileStoreData> {
	set: (data: CertifiedUserProfileData | null) => void;
	reset: () => void;
}

const initUserProfileStore = (): UserProfileStore => {
	const { subscribe, set } = writable<UserProfileStoreData>(undefined);

	return {
		set: (data: CertifiedUserProfileData | null) => set(data),
		reset: () => set(null),
		subscribe
	};
};

export const userProfileStore = initUserProfileStore();

/**
 * Whether the profile was created by *this* sign-in, rather than found already
 * there — which is the only reliable way to tell a first-time visitor from a
 * returning one. `queryUnsafeProfile` finding nothing and `create_user_profile`
 * succeeding is the canister saying "we have never seen this principal".
 *
 * Deliberately not persisted. It describes one sign-in, and a value that
 * outlived the session would start claiming an established user is new.
 *
 * `created_timestamp` on the profile could stand in for this, but only by
 * picking a threshold for how recent counts as new. There is no honest number
 * for that, so this is the fact instead of a guess at it.
 */
export const userProfileCreated = writable<boolean>(false);
