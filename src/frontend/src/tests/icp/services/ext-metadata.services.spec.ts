import type { MetadataValue, TokenIdentifier } from '$declarations/ext_v2_token/ext_v2_token.did';
import { metadata as metadataApi } from '$icp/api/ext-v2-token.api';
import { getExtMetadata } from '$icp/services/ext-metadata.services';
import type { CanisterApiFunctionParamsWithCanisterId } from '$lib/types/canister';
import type { NftMetadataWithoutId } from '$lib/types/nft';
import {
	mockExtDecodedMetadata,
	mockExtLegacyMetadata,
	mockExtMetadata,
	mockExtParsedMetadata,
	mockExtV2TokenCanisterId,
	mockExtV2TokenIdentifier
} from '$tests/mocks/ext-v2-token.mock';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { toNullable, type QueryParams } from '@dfinity/utils';
import type { MockInstance } from 'vitest';

metadataApi;

vi.mock('$icp/api/ext-v2-token.api', () => ({
	metadata: vi.fn()
}));

describe('ext-metadata.services', () => {
	describe('getExtMetadata', () => {
		let decodeSpy: MockInstance;

		const mockParams: CanisterApiFunctionParamsWithCanisterId<
			{ tokenIdentifier: TokenIdentifier } & QueryParams
		> = {
			identity: mockIdentity,
			canisterId: mockExtV2TokenCanisterId,
			tokenIdentifier: mockExtV2TokenIdentifier
		};

		const expected: NftMetadataWithoutId = {
			name: mockExtParsedMetadata.name,
			description: mockExtParsedMetadata.description,
			imageUrl: mockExtParsedMetadata.url,
			thumbnailUrl: mockExtParsedMetadata.thumbnail,
			attributes: mockExtParsedMetadata.attributes
		};

		beforeEach(() => {
			vi.clearAllMocks();

			vi.mocked(metadataApi).mockResolvedValue(mockExtMetadata);

			decodeSpy = vi.spyOn(TextDecoder.prototype, 'decode').mockReturnValue(mockExtDecodedMetadata);
		});

		it('should call the API metadata method of the canister', async () => {
			await getExtMetadata(mockParams);

			expect(metadataApi).toHaveBeenCalledExactlyOnceWith(mockParams);

			expect(decodeSpy).toHaveBeenCalled();
		});

		it('should return early if the API metadata response is nullish', async () => {
			vi.mocked(metadataApi).mockResolvedValueOnce(undefined);

			await expect(getExtMetadata(mockParams)).resolves.toBeUndefined();

			expect(decodeSpy).not.toHaveBeenCalled();
		});

		it('should return early if the API metadata response is not for non-fungible tokens', async () => {
			vi.mocked(metadataApi).mockResolvedValueOnce({
				fungible: {
					metadata: toNullable({ blob: new Uint8Array([1, 2, 3]) }),
					name: 'Mock Token',
					decimals: 8,
					symbol: 'MOCK'
				}
			});

			await expect(getExtMetadata(mockParams)).resolves.toBeUndefined();

			expect(decodeSpy).not.toHaveBeenCalled();
		});

		it('should return the metadata when they are a blob type', async () => {
			await expect(getExtMetadata(mockParams)).resolves.toStrictEqual(expected);
		});

		it('should return the metadata when they are a json type', async () => {
			vi.mocked(metadataApi).mockResolvedValue({
				nonfungible: {
					metadata: toNullable({ json: mockExtDecodedMetadata }),
					name: 'Mock NFT',
					thumbnail: 'https://example.com/thumbnail.png',
					asset: 'https://example.com/asset.png'
				}
			});

			await expect(getExtMetadata(mockParams)).resolves.toStrictEqual(expected);
		});

		it('should return undefined when the metadata are a data type', async () => {
			vi.mocked(metadataApi).mockResolvedValue({
				nonfungible: {
					metadata: toNullable({ data: [['decimals', { nat: 8n }] as MetadataValue] }),
					name: 'Mock NFT',
					thumbnail: 'https://example.com/thumbnail.png',
					asset: 'https://example.com/asset.png'
				}
			});

			await expect(getExtMetadata(mockParams)).resolves.toBeUndefined();
		});

		it('should return the legacy metadata', async () => {
			vi.mocked(metadataApi).mockResolvedValue(mockExtLegacyMetadata);

			await expect(getExtMetadata(mockParams)).resolves.toStrictEqual(expected);
		});

		it('should handle gracefully invalid JSON metadata', async () => {
			vi.spyOn(JSON, 'parse').mockRejectedValue(new Error('Invalid JSON'));

			await expect(getExtMetadata(mockParams)).resolves.toStrictEqual({
				attributes: undefined,
				description: undefined,
				imageUrl: undefined,
				name: undefined,
				thumbnailUrl: undefined
			});
		});

		it('should handle gracefully invalid UTF-8 blob metadata', async () => {
			vi.spyOn(TextDecoder.prototype, 'decode').mockRejectedValue(new Error('Invalid UTF-8'));

			await expect(getExtMetadata(mockParams)).resolves.toStrictEqual({
				attributes: undefined,
				description: undefined,
				imageUrl: undefined,
				name: undefined,
				thumbnailUrl: undefined
			});
		});

		it('should handle gracefully empty metadata', async () => {
			vi.spyOn(TextDecoder.prototype, 'decode').mockReturnValue('{}');

			await expect(getExtMetadata(mockParams)).resolves.toStrictEqual({
				attributes: undefined,
				description: undefined,
				imageUrl: undefined,
				name: undefined,
				thumbnailUrl: undefined
			});
		});
	});
});
