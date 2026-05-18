import type { Value } from '$declarations/icrc7/icrc7.did';
import { isTokenIcrc7, mapIcrc7CollectionMetadata } from '$icp/utils/icrc7.utils';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';

describe('icrc7.utils', () => {
	describe('isTokenIcrc7', () => {
		it('should return true for an ICRC-7 token', () => {
			expect(isTokenIcrc7(mockValidIcrc7Token)).toBeTruthy();
		});

		it('should return false for a non-ICRC-7 token', () => {
			expect(isTokenIcrc7(mockValidIcPunksToken)).toBeFalsy();
		});

		it('should return false when standard is missing', () => {
			expect(isTokenIcrc7({})).toBeFalsy();
		});
	});

	describe('mapIcrc7CollectionMetadata', () => {
		const fullEntries: Array<[string, Value]> = [
			['icrc7:name', { Text: 'Cosmicrafts Avatars' }],
			['icrc7:symbol', { Text: 'CCC' }],
			['icrc7:description', { Text: 'A test collection' }],
			['icrc7:logo', { Text: 'https://example.com/logo.png' }],
			['icrc7:total_supply', { Nat: 1000n }]
		];

		it('should map all standard text keys', () => {
			expect(mapIcrc7CollectionMetadata(fullEntries)).toEqual({
				name: 'Cosmicrafts Avatars',
				symbol: 'CCC',
				description: 'A test collection',
				icon: 'https://example.com/logo.png'
			});
		});

		it('should omit description and icon when absent', () => {
			const minimal: Array<[string, Value]> = [
				['icrc7:name', { Text: 'Coll' }],
				['icrc7:symbol', { Text: 'C' }]
			];

			expect(mapIcrc7CollectionMetadata(minimal)).toEqual({
				name: 'Coll',
				symbol: 'C'
			});
		});

		it('should return undefined when name is missing', () => {
			const noName: Array<[string, Value]> = [['icrc7:symbol', { Text: 'C' }]];

			expect(mapIcrc7CollectionMetadata(noName)).toBeUndefined();
		});

		it('should return undefined when symbol is missing', () => {
			const noSymbol: Array<[string, Value]> = [['icrc7:name', { Text: 'Coll' }]];

			expect(mapIcrc7CollectionMetadata(noSymbol)).toBeUndefined();
		});

		it('should ignore non-Text values for required keys', () => {
			const wrongType: Array<[string, Value]> = [
				['icrc7:name', { Nat: 42n }],
				['icrc7:symbol', { Text: 'C' }]
			];

			expect(mapIcrc7CollectionMetadata(wrongType)).toBeUndefined();
		});

		it('should ignore non-Text optional values without breaking', () => {
			const wrongType: Array<[string, Value]> = [
				['icrc7:name', { Text: 'Coll' }],
				['icrc7:symbol', { Text: 'C' }],
				['icrc7:description', { Nat: 1n }],
				['icrc7:logo', { Blob: new Uint8Array() }]
			];

			expect(mapIcrc7CollectionMetadata(wrongType)).toEqual({
				name: 'Coll',
				symbol: 'C'
			});
		});

		it('should return undefined for an empty entries array', () => {
			expect(mapIcrc7CollectionMetadata([])).toBeUndefined();
		});
	});
});
