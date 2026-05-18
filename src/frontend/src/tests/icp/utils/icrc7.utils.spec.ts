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
});
