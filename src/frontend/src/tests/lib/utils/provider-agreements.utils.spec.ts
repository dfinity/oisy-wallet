import type {
	UserAgreement as BackendUserAgreement,
	ProviderAgreementType
} from '$declarations/backend/backend.did';
import type { UserProviderAgreements } from '$lib/types/user-provider-agreements';
import {
	mapBackendProviderAgreements,
	mapProviderAgreements,
	mapProviderKey,
	mapScopeKey,
	providerAgreementId
} from '$lib/utils/provider-agreements.utils';
import { toNullable } from '@dfinity/utils';

describe('provider-agreements.utils', () => {
	describe('mapProviderKey', () => {
		it('should map NearIntents variant to string id', () => {
			expect(mapProviderKey({ NearIntents: null })).toBe('NearIntents');
		});

		it('should throw for unknown provider variant', () => {
			expect(() =>
				// @ts-expect-error we test this on purpose
				mapProviderKey({ Unknown: null })
			).toThrow();
		});
	});

	describe('mapScopeKey', () => {
		it('should map Swap variant to string id', () => {
			expect(mapScopeKey({ Swap: null })).toBe('Swap');
		});

		it('should throw for unknown scope variant', () => {
			// @ts-expect-error we test this on purpose
			expect(() => mapScopeKey({ Unknown: null })).toThrow();
		});
	});

	describe('providerAgreementId', () => {
		it('should produce a combined template literal key', () => {
			const key: ProviderAgreementType = {
				provider: { NearIntents: null },
				scope: { Swap: null }
			};

			expect(providerAgreementId(key)).toBe('NearIntents-Swap');
		});
	});

	describe('mapProviderAgreements', () => {
		it('should convert backend tuples to a UserProviderAgreements record', () => {
			const backendAgreements: Array<[ProviderAgreementType, BackendUserAgreement]> = [
				[
					{ provider: { NearIntents: null }, scope: { Swap: null } },
					{
						accepted: toNullable(true),
						last_accepted_at_ns: toNullable(1677628801n),
						last_updated_at_ms: toNullable(1677628800n),
						text_sha256: toNullable('abc123')
					}
				]
			];

			const result = mapProviderAgreements(backendAgreements);

			expect(result).toEqual({
				'NearIntents-Swap': {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: 1677628800n,
					textSha256: 'abc123'
				}
			});
		});

		it('should handle empty backend array', () => {
			expect(mapProviderAgreements([])).toEqual({});
		});

		it('should handle backend agreements with nullish optional fields', () => {
			const backendAgreements: Array<[ProviderAgreementType, BackendUserAgreement]> = [
				[
					{ provider: { NearIntents: null }, scope: { Swap: null } },
					{
						accepted: toNullable(),
						last_accepted_at_ns: toNullable(),
						last_updated_at_ms: toNullable(),
						text_sha256: toNullable()
					}
				]
			];

			const result = mapProviderAgreements(backendAgreements);

			expect(result).toEqual({
				'NearIntents-Swap': {
					accepted: undefined,
					lastAcceptedTimestamp: undefined,
					lastUpdatedTimestamp: undefined,
					textSha256: undefined
				}
			});
		});
	});

	describe('mapBackendProviderAgreements', () => {
		it('should convert a UserProviderAgreements record to backend tuples', () => {
			const providerAgreements: UserProviderAgreements = {
				'NearIntents-Swap': {
					accepted: true,
					lastAcceptedTimestamp: 1677628801n,
					lastUpdatedTimestamp: 1677628800n,
					textSha256: 'abc123'
				}
			};

			const result = mapBackendProviderAgreements(providerAgreements);

			expect(result).toEqual([
				[
					{ provider: { NearIntents: null }, scope: { Swap: null } },
					{
						accepted: toNullable(true),
						last_accepted_at_ns: toNullable(1677628801n),
						last_updated_at_ms: toNullable(1677628800n),
						text_sha256: toNullable('abc123')
					}
				]
			]);
		});

		it('should handle empty record', () => {
			expect(mapBackendProviderAgreements({})).toEqual([]);
		});

		it('should handle agreement data with undefined fields', () => {
			const providerAgreements: UserProviderAgreements = {
				'NearIntents-Swap': {
					accepted: undefined,
					lastAcceptedTimestamp: undefined,
					lastUpdatedTimestamp: undefined,
					textSha256: undefined
				}
			};

			const result = mapBackendProviderAgreements(providerAgreements);

			expect(result).toEqual([
				[
					{ provider: { NearIntents: null }, scope: { Swap: null } },
					{
						accepted: toNullable(),
						last_accepted_at_ns: toNullable(),
						last_updated_at_ms: toNullable(),
						text_sha256: toNullable()
					}
				]
			]);
		});
	});

	describe('round-trip', () => {
		it('should round-trip from backend to frontend and back', () => {
			const original: Array<[ProviderAgreementType, BackendUserAgreement]> = [
				[
					{ provider: { NearIntents: null }, scope: { Swap: null } },
					{
						accepted: toNullable(true),
						last_accepted_at_ns: toNullable(100n),
						last_updated_at_ms: toNullable(200n),
						text_sha256: toNullable('hash')
					}
				]
			];

			const frontend = mapProviderAgreements(original);
			const backAgain = mapBackendProviderAgreements(frontend);

			expect(backAgain).toEqual(original);
		});
	});
});
