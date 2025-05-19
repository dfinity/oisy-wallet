import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { TRUMP_TOKEN, TRUMP_TOKEN_ID } from '$env/tokens/tokens-spl/tokens.trump.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isSolanaToken, isTrumpToken } from '$sol/utils/token.utils';

describe('token.utils', () => {
	describe('isSolanaToken', () => {
		it.each([...SUPPORTED_SOLANA_TOKENS, ...SPL_TOKENS])(
			'should return true for token $name',
			(token) => {
				expect(isSolanaToken(token)).toBeTruthy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return false for token $name', (token) => {
			expect(isSolanaToken(token)).toBeFalsy();
		});
	});

	describe('isTrumpToken', () => {
		it('should return true for TRUMP token', () => {
			expect(isTrumpToken(TRUMP_TOKEN)).toBeTruthy();
		});

		it.each([...SUPPORTED_SOLANA_TOKENS, ...SPL_TOKENS.filter(({ id }) => id !== TRUMP_TOKEN_ID)])(
			'should return false for token $name',
			(token) => {
				expect(isTrumpToken(token)).toBeFalsy();
			}
		);

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTrumpToken(token)).toBeFalsy();
		});
	});
});
