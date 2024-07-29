import type { UserProfile } from '$declarations/backend/backend.did';
import { writable, type Readable } from 'svelte/store';

// * `undefined` means the store is not loaded yet.
// * `null` means there was an error.
// * `UserProfile` is the data.
export type UserProfileStoreData = UserProfile | undefined | null;

export interface UserProfileStore extends Readable<UserProfileStoreData> {
	set: (data: UserProfileStoreData) => void;
	reset: () => void;
}

const initUserProfileStore = (): UserProfileStore => {
	const { subscribe, set } = writable<UserProfileStoreData>(undefined);

	return {
		set: (data: UserProfileStoreData | null) => set(data),
		reset: () => set(undefined),
		subscribe
	};
};

export const userProfileStore = initUserProfileStore();
