import type { UserProfile } from '$declarations/backend/backend.did';
import { hasPouhCredential } from '$lib/utils/credentials.utils';
import { mockUserProfile } from '$tests/mocks/user-profile.mock';

describe('credentials utils', () => {
	describe('hasPouhCredential', () => {
		it('should return undefined if the user has no profile yet', () => {
			expect(hasPouhCredential(undefined)).toBeUndefined();
			expect(hasPouhCredential(null)).toBeUndefined();
		});

		it('should return true if the user has verified credential', () => {
			const profile: UserProfile = {
				...mockUserProfile,
				credentials: [
					{
						issuer: 'test',
						credential_type: { ProofOfUniqueness: null },
						verified_date_timestamp: [123456n]
					}
				],
				version: [0n]
			};

			expect(hasPouhCredential(profile)).toBeTruthy();
		});

		it('should return false if the user has credential but not verified', () => {
			const profile: UserProfile = {
				...mockUserProfile,
				credentials: [
					{
						issuer: 'test',
						credential_type: { ProofOfUniqueness: null },
						verified_date_timestamp: []
					}
				],
				version: [0n]
			};

			expect(hasPouhCredential(profile)).toBeFalsy();
		});

		it('should return false if the user has no credentials', () => {
			const profile: UserProfile = {
				...mockUserProfile,
				version: [0n]
			};

			expect(hasPouhCredential(profile)).toBeFalsy();
		});
	});
});
