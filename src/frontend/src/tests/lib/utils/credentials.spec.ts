import type { UserProfile } from '$declarations/backend/backend.did';
import { hasPouhCredential } from '$lib/utils/credentials.utils';

describe('credentials utils', () => {
	describe('hasPouhCredential', () => {
		it('should return undefined if the user has no profile yet', () => {
			expect(hasPouhCredential(undefined)).toBeUndefined();
			expect(hasPouhCredential(null)).toBeUndefined();
		});

		it('should return true if the user has verified credential', () => {
			const profile: UserProfile = {
				credentials: [
					{
						issuer: 'test',
						credential_type: { ProofOfUniqueness: null },
						verified_date_timestamp: [123456n]
					}
				],
				created_timestamp: 123456n,
				updated_timestamp: 123456n,
				version: [0n]
			};
			expect(hasPouhCredential(profile)).toBe(true);
		});

		it('should return false if the user has credential but not verified', () => {
			const profile: UserProfile = {
				credentials: [
					{
						issuer: 'test',
						credential_type: { ProofOfUniqueness: null },
						verified_date_timestamp: []
					}
				],
				created_timestamp: 123456n,
				updated_timestamp: 123456n,
				version: [0n]
			};
			expect(hasPouhCredential(profile)).toBe(false);
		});

		it('should return false if the user has no credentials', () => {
			const profile: UserProfile = {
				credentials: [],
				created_timestamp: 123456n,
				updated_timestamp: 123456n,
				version: [0n]
			};
			expect(hasPouhCredential(profile)).toBe(false);
		});
	});
});
