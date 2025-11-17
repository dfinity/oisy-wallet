import type { UserProfile } from '$declarations/backend/declarations/backend.did';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

interface CertifiedUserProfileData {
	profile: UserProfile;
	certified: boolean;
}

// * `undefined` means the store is not loaded yet.
// * `null` means there was an error.
// * `UserProfile` is the data.
export type UserProfileStoreData = Option<CertifiedUserProfileData>;

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
