import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { Icrc7TokenWithoutId } from '$icp/types/icrc7-token';
import { isTokenIcrc7, isTokenIcrc7CustomToken, mapIcrc7Token } from '$icp/utils/icrc7.utils';
import { TokenCategoryTagValue, TokenTagType } from '$lib/enums/token-tag';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';
import { mockIcrc7CanisterId, mockValidIcrc7Token } from '$tests/mocks/icrc7-tokens.mock';

describe('icrc7.utils', () => {
	describe('isTokenIcrc7', () => {
		it.each(['icrc7'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcrc7({
					...mockIcrcCustomToken,
					standard: { code: standard as TokenStandardCode }
				})
			).toBeTruthy();
		});

		it.each(['icrc', 'icpunks', 'ext', 'dip721', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcrc7({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIcrc7CustomToken', () => {
		const mockTokens = [mockValidIcrc7Token];

		it.each(
			mockTokens.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenIcrc7CustomToken(token)).toBeTruthy();
		});

		it.each(mockTokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenIcrc7CustomToken(token)).toBeFalsy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...mockTokens
		])('should return false for token $name', (token) => {
			expect(isTokenIcrc7CustomToken(token)).toBeFalsy();
		});
	});

	describe('mapIcrc7Token', () => {
		const mockSymbol = 'MOCKICRC7';
		const mockName = 'Mock ICRC-7 Collection';
		const mockCanisterId = mockIcrc7CanisterId;
		const mockParams = {
			canisterId: mockCanisterId,
			metadata: { symbol: mockSymbol, name: mockName }
		};

		const expected: Icrc7TokenWithoutId = {
			canisterId: mockCanisterId,
			network: ICP_NETWORK,
			name: mockName,
			symbol: mockSymbol,
			decimals: 0,
			standard: { code: 'icrc7' },
			category: 'custom',
			tags: [{ type: TokenTagType.CATEGORY, value: TokenCategoryTagValue.CRYPTO }]
		};

		it('should correctly map an ICRC-7 token', () => {
			expect(mapIcrc7Token(mockParams)).toStrictEqual(expected);
		});

		it('should handle empty string as name', () => {
			expect(
				mapIcrc7Token({ ...mockParams, metadata: { ...mockParams.metadata, name: '' } })
			).toStrictEqual({
				...expected,
				name: ''
			});
		});

		it('should handle empty string as symbol', () => {
			expect(
				mapIcrc7Token({ ...mockParams, metadata: { ...mockParams.metadata, symbol: '' } })
			).toStrictEqual({
				...expected,
				symbol: ''
			});
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
							Text: 'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3A3dafe45&owner_id=sey3i-jyaaa-aaaap-quo3q-cai'
						}
					],
					['icrc7:attributes', { Map: [['Background', { Text: 'Blue' }]] }]
				])
			).toEqual({
				name: 'Token #50',
				description: 'The test NFT',
				imageUrl:
					'https://blob.caffeine.ai/v1/blob/?blob_hash=sha256%3A3dafe45&owner_id=sey3i-jyaaa-aaaap-quo3q-cai',
				attributes: [{ traitType: 'Background', value: 'Blue' }]
			});
		});

		it('should map icrc7:metadata namespace keys', () => {
			expect(
				mapIcrc7TokenMetadata([
					['icrc7:metadata:name', { Text: 'Namespaced token' }],
					['icrc7:metadata:description', { Text: 'Namespaced description' }],
					['icrc7:metadata:image_url', { Text: 'https://example.com/token.png' }]
				])
			).toEqual({
				name: 'Namespaced token',
				description: 'Namespaced description',
				imageUrl: 'https://example.com/token.png'
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
