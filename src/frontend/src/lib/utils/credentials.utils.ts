import type { UserCredential, UserProfile } from '$declarations/backend/declarations/backend.did';
import { POUH_CREDENTIAL_TYPE } from '$lib/constants/credentials.constants';
import type { Option } from '$lib/types/utils';
import { isNullish } from '@dfinity/utils';

const isVerifiedCredential = (credential: UserCredential): boolean =>
	credential.verified_date_timestamp.length > 0;

const isVerifiedPouhCredential = (credential: UserCredential): boolean =>
	POUH_CREDENTIAL_TYPE in credential.credential_type && isVerifiedCredential(credential);

/**
 * Returns true if the user has a verified proof of uniqueness credential
 * Returns false if the user has no verified proof of uniqueness credential
 * Returns undefined if the user has no profile yet. It means it's loading.
 *
 * @param profile {UserProfile | null | undefined} The user profile.
 * @returns {boolean | undefined}
 */
export const hasPouhCredential = (profile: Option<UserProfile>): boolean | undefined => {
	if (isNullish(profile)) {
		return undefined;
	}
	return profile.credentials.some(isVerifiedPouhCredential);
};
