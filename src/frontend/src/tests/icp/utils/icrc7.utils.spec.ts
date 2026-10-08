import type { Value } from '$declarations/icrc7/icrc7.did';
import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import {
	isTokenIcrc7,
	isTokenIcrc7CustomToken,
	mapIcrc7CollectionMetadata,
	mapIcrc7Token,
	mapIcrc7TokenMetadata
} from '$icp/utils/icrc7.utils';
import { DEFAULT_TOKEN_TAGS } from '$lib/constants/token-tag.constants';
import { mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockIcrc7CanisterId, mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';
import { uint8ArrayToBase64 } from '@dfinity/utils';

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

	describe('isTokenIcrc7CustomToken', () => {
		const toggleableIcrc7Token = { ...mockValidIcrc7Token, enabled: true };
		const toggleableIcPunksToken = { ...mockValidIcPunksToken, enabled: true };

		it('should return true for a toggleable ICRC-7 token (has `enabled`)', () => {
			expect(isTokenIcrc7CustomToken(toggleableIcrc7Token)).toBeTruthy();
		});

		it('should return false for a non-toggleable ICRC-7 token (no `enabled`)', () => {
			expect(isTokenIcrc7CustomToken(mockValidIcrc7Token)).toBeFalsy();
		});

		it('should return false for a non-ICRC-7 toggleable token', () => {
			expect(isTokenIcrc7CustomToken(toggleableIcPunksToken)).toBeFalsy();
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

	describe('mapIcrc7Token', () => {
		it('should map an EnvIcrc7Token into an Icrc7TokenWithoutId', () => {
			expect(
				mapIcrc7Token({
					canisterId: mockIcrc7CanisterId,
					metadata: { name: 'Cosmicrafts', symbol: 'CCC' }
				})
			).toEqual({
				canisterId: mockIcrc7CanisterId,
				network: ICP_NETWORK,
				name: 'Cosmicrafts',
				symbol: 'CCC',
				decimals: 0,
				standard: { code: 'icrc7' },
				category: 'custom',
				tags: DEFAULT_TOKEN_TAGS
			});
		});
	});

	describe('mapIcrc7TokenMetadata', () => {
		it('should map prefixed token metadata keys', () => {
			expect(
				mapIcrc7TokenMetadata([
					['icrc7:name', { Text: 'Token #50' }],
					['icrc7:description', { Text: 'The test NFT' }],
					[
						'icrc7:image',
						{
							Text: 'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3A3dafe45&owner_id=ipchn-lqaaa-aaaam-qizkq-cai'
						}
					],
					['icrc7:attributes', { Map: [['Background', { Text: 'Blue' }]] }]
				])
			).toEqual({
				name: 'Token #50',
				description: 'The test NFT',
				imageUrl:
					'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3A3dafe45&owner_id=ipchn-lqaaa-aaaam-qizkq-cai',
				attributes: [{ traitType: 'Background', value: 'Blue' }]
			});
		});

		it('should map icrc7:metadata namespace keys', () => {
			expect(
				mapIcrc7TokenMetadata([
					['icrc7:metadata:name', { Text: 'Namespaced token' }],
					['icrc7:metadata:description', { Text: 'Namespaced description' }],
					['icrc7:metadata:uri', { Text: 'https://example.com/token.json' }],
					['icrc7:metadata:image_url', { Text: 'https://example.com/token.png' }],
					['icrc7:metadata:thumbnail_url', { Text: 'https://example.com/token-thumb.png' }]
				])
			).toEqual({
				name: 'Namespaced token',
				description: 'Namespaced description',
				imageUrl: 'https://example.com/token.png',
				thumbnailUrl: 'https://example.com/token-thumb.png'
			});
		});

		it('should map Caffeine-style token metadata keys and extra scalar fields', () => {
			expect(
				mapIcrc7TokenMetadata([
					['title', { Text: 'The CEO' }],
					['tokenId', { Nat: 1n }],
					['edition', { Text: '#001' }],
					['owner', { Text: '32vht-6nko3-fxqgs-z7rrt-b2vs3-hdpnp-3nb5a-rnxjm-citus-uuvqc-zae' }],
					['rarityTier', { Text: 'TIER1' }],
					['icrc7:metadata:powerLevel', { Int: 9001n }],
					['description', { Text: '' }],
					[
						'imageUrl',
						{
							Text: 'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3A6fc6a25f4d52e13a80b007aeac3641106587d1f331447ce506a9bb1afd399eeb&owner_id=ipchn-lqaaa-aaaam-qizkq-cai&project_id=019de6f2-675c-775e-9eda-2adf4341566c'
						}
					]
				])
			).toEqual({
				name: 'The CEO',
				description: '',
				imageUrl:
					'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3A6fc6a25f4d52e13a80b007aeac3641106587d1f331447ce506a9bb1afd399eeb&owner_id=ipchn-lqaaa-aaaam-qizkq-cai&project_id=019de6f2-675c-775e-9eda-2adf4341566c',
				attributes: [
					{ traitType: 'tokenId', value: '1' },
					{ traitType: 'edition', value: '#001' },
					{
						traitType: 'owner',
						value: '32vht-6nko3-fxqgs-z7rrt-b2vs3-hdpnp-3nb5a-rnxjm-citus-uuvqc-zae'
					},
					{ traitType: 'rarityTier', value: 'TIER1' },
					{ traitType: 'powerLevel', value: '9001' }
				]
			});
		});

		it('should map image blobs into data URLs', () => {
			expect(
				mapIcrc7TokenMetadata([
					[
						'icrc7:image',
						{ Blob: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) }
					]
				])
			).toEqual({
				imageUrl: 'data:image/png;base64,iVBORw0KGgo='
			});
		});

		it('should map SVG blobs with XML and comments into data URLs', () => {
			const blob = new TextEncoder().encode(
				'<?xml version="1.0"?>\n<!-- icon -->\n<svg xmlns="http://www.w3.org/2000/svg"/>'
			);

			expect(mapIcrc7TokenMetadata([['icrc7:image', { Blob: blob }]])).toEqual({
				imageUrl: `data:image/svg+xml;base64,${uint8ArrayToBase64(blob)}`
			});
		});

		it('should map unprefixed fallback keys and array attributes', () => {
			expect(
				mapIcrc7TokenMetadata([
					['name', { Text: 'Fallback token' }],
					['image', { Text: 'https://example.com/fallback.png' }],
					[
						'attributes',
						{
							Array: [
								{
									Map: [
										['trait_type', { Text: 'Level' }],
										['value', { Nat: 50n }]
									]
								}
							]
						}
					]
				])
			).toEqual({
				name: 'Fallback token',
				imageUrl: 'https://example.com/fallback.png',
				attributes: [{ traitType: 'Level', value: '50' }]
			});
		});

		it('should ignore unsupported metadata values without throwing', () => {
			expect(
				mapIcrc7TokenMetadata([
					['icrc7:name', { Blob: new Uint8Array([1, 2, 3]) }],
					['icrc7:image', { Blob: new Uint8Array([4, 5, 6]) }],
					['icrc7:attributes', { Text: 'not an attributes structure' }]
				])
			).toEqual({});
		});
	});
});
