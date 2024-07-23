import type { UserProfile } from '$declarations/backend/backend.did';
import { isNullish } from '@dfinity/utils';

/**
 * Returns true if the user has a verified proof of uniqueness credential
 * Returns false if the user has no verified proof of uniqueness credential
 * Returns undefined if the user has no profile yet. It means it's loading.
 *
 * @param profile {UserProfile | null | undefined} The user profile.
 * @returns {boolean | undefined}
 */
export const hasPouhCredential = (profile: UserProfile | null | undefined): boolean | undefined => {
	if (isNullish(profile)) {
		return undefined;
	}
	return profile.credentials.some(
		(cred) => 'ProofOfUniqueness' in cred.credential_type && cred.verified_date_timestamp.length > 0
	);
};
