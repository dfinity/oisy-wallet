import {
	hasAcknowledgedNearIntentsSwap,
	userProviderAgreements
} from '$lib/derived/user-provider-agreements.derived';
import { userProfileStore } from '$lib/stores/user-profile.store';
import { mockUserAgreements, mockUserProfile } from '$tests/mocks/user-profile.mock';
import { toNullable } from '@dfinity/utils';
import { get } from 'svelte/store';

describe('user-provider-agreements.derived', () => {
	const certified = false;

	describe('userProviderAgreements', () => {
		it('should return empty object when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(userProviderAgreements)).toStrictEqual({});
		});

		it('should return empty object when agreements data is nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable()
				}
			});

			expect(get(userProviderAgreements)).toStrictEqual({});
		});

		it('should return empty object when provider_agreements is nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable()
					})
				}
			});

			expect(get(userProviderAgreements)).toStrictEqual({});
		});

		it('should return mapped provider agreements when set', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable([
							[
								{ provider: { NearIntents: null }, scope: { Swap: null } },
								{
									accepted: toNullable(true),
									last_accepted_at_ns: toNullable(1677628801n),
									last_updated_at_ms: toNullable(1677628800n),
									text_sha256: toNullable('abc123')
								}
							]
						])
					})
				}
			});

			expect(get(userProviderAgreements)).toStrictEqual({
				'NearIntents-Swap': {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: 1677628800n,
					textSha256: 'abc123'
				}
			});
		});

		it('should return provider agreements with nullish fields when backend has empty optionals', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable([
							[
								{ provider: { NearIntents: null }, scope: { Swap: null } },
								{
									accepted: toNullable(),
									last_accepted_at_ns: toNullable(),
									last_updated_at_ms: toNullable(),
									text_sha256: toNullable()
								}
							]
						])
					})
				}
			});

			expect(get(userProviderAgreements)).toStrictEqual({
				'NearIntents-Swap': {
					accepted: undefined,
					lastAcceptedTimestamp: undefined,
					lastUpdatedTimestamp: undefined,
					textSha256: undefined
				}
			});
		});
	});

	describe('hasAcknowledgedNearIntentsSwap', () => {
		it('should return false when user profile is not set', () => {
			userProfileStore.reset();

			expect(get(hasAcknowledgedNearIntentsSwap)).toBeFalsy();
		});

		it('should return false when provider_agreements is nullish', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable()
					})
				}
			});

			expect(get(hasAcknowledgedNearIntentsSwap)).toBeFalsy();
		});

		it('should return false when NearIntents-Swap has accepted === undefined', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable([
							[
								{ provider: { NearIntents: null }, scope: { Swap: null } },
								{
									accepted: toNullable(),
									last_accepted_at_ns: toNullable(),
									last_updated_at_ms: toNullable(),
									text_sha256: toNullable()
								}
							]
						])
					})
				}
			});

			expect(get(hasAcknowledgedNearIntentsSwap)).toBeFalsy();
		});

		it('should return false when NearIntents-Swap has accepted === false', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable([
							[
								{ provider: { NearIntents: null }, scope: { Swap: null } },
								{
									accepted: toNullable(false),
									last_accepted_at_ns: toNullable(1677628801n),
									last_updated_at_ms: toNullable(1677628800n),
									text_sha256: toNullable('abc123')
								}
							]
						])
					})
				}
			});

			expect(get(hasAcknowledgedNearIntentsSwap)).toBeFalsy();
		});

		it('should return true when NearIntents-Swap has accepted === true', () => {
			userProfileStore.set({
				certified,
				profile: {
					...mockUserProfile,
					agreements: toNullable({
						...mockUserAgreements,
						provider_agreements: toNullable([
							[
								{ provider: { NearIntents: null }, scope: { Swap: null } },
								{
									accepted: toNullable(true),
									last_accepted_at_ns: toNullable(1677628801n),
									last_updated_at_ms: toNullable(1677628800n),
									text_sha256: toNullable('abc123')
								}
							]
						])
					})
				}
			});

			expect(get(hasAcknowledgedNearIntentsSwap)).toBeTruthy();
		});
	});
});
