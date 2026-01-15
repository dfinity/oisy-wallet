import { ICP_NETWORK } from '$env/networks/networks.icp.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import type { IcPunksTokenWithoutId } from '$icp/types/icpunks-token';
import {
	isTokenIcPunks,
	isTokenIcPunksCustomToken,
	mapIcPunksToken
} from '$icp/utils/icpunks.utils';
import type { TokenStandardCode } from '$lib/types/token';
import { mockIcPunksCanisterId, mockValidIcPunksToken } from '$tests/mocks/icpunks-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('icpunks.utils', () => {
	describe('isTokenIcPunks', () => {
		it.each(['icpunks'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenIcPunks({
					...mockIcrcCustomToken,
					standard: { code: standard as TokenStandardCode }
				})
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenIcPunks({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});

	describe('isTokenIcPunksCustomToken', () => {
		const mockTokens = [mockValidIcPunksToken];

		it.each(
			mockTokens.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenIcPunksCustomToken(token)).toBeTruthy();
		});

		it.each(mockTokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenIcPunksCustomToken(token)).toBeFalsy();
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
			expect(isTokenIcPunksCustomToken(token)).toBeFalsy();
		});
	});

	describe('mapIcPunksToken', () => {
		const mockSymbol = 'MOCKPUNKS';
		const mockName = 'Mock ICPunks Token';
		const mockCanisterId = mockIcPunksCanisterId;
		const mockParams = {
			canisterId: mockCanisterId,
			metadata: { symbol: mockSymbol, name: mockName }
		};

		const expected: IcPunksTokenWithoutId = {
			canisterId: mockCanisterId,
			network: ICP_NETWORK,
			name: mockName,
			symbol: mockSymbol,
			decimals: 0,
			standard: { code: 'icpunks' },
			category: 'custom'
		};

		it('should correctly map an ICPunks token', () => {
			expect(mapIcPunksToken(mockParams)).toStrictEqual(expected);
		});

		it('should handle empty string as name', () => {
			expect(
				mapIcPunksToken({ ...mockParams, metadata: { ...mockParams.metadata, name: '' } })
			).toStrictEqual({
				...expected,
				name: ''
			});
		});

		it('should handle empty string as symbol', () => {
			expect(
				mapIcPunksToken({ ...mockParams, metadata: { ...mockParams.metadata, symbol: '' } })
			).toStrictEqual({
				...expected,
				symbol: ''
			});
		});
	});
});
