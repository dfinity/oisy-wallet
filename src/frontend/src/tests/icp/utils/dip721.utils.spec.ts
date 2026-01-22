import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenDip721, isTokenDip721CustomToken } from '$icp/utils/dip721.utils';
import type { TokenStandardCode } from '$lib/types/token';
import { mockValidDip721Token } from '$tests/mocks/dip721-tokens.mock';
import { mockIcrcCustomToken } from '$tests/mocks/icrc-custom-tokens.mock';

describe('dip721.utils', () => {
	describe('isTokenDip721', () => {
		it.each(['dip721'])('should return true for valid token standards: %s', (standard) => {
			expect(
				isTokenDip721({ ...mockIcrcCustomToken, standard: { code: standard as TokenStandardCode } })
			).toBeTruthy();
		});

		it.each(['icrc', 'ethereum', 'erc20', 'bitcoin', 'solana', 'spl'])(
			'should return false for invalid token standards: %s',
			(standard) => {
				expect(
					isTokenDip721({
						...mockIcrcCustomToken,
						standard: { code: standard as TokenStandardCode }
					})
				).toBeFalsy();
			}
		);
	});

	describe('isTokenDip721CustomToken', () => {
		const mockTokens = [mockValidDip721Token];

		it.each(
			mockTokens.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenDip721CustomToken(token)).toBeTruthy();
		});

		it.each(mockTokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenDip721CustomToken(token)).toBeFalsy();
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
			expect(isTokenDip721CustomToken(token)).toBeFalsy();
		});
	});
});
