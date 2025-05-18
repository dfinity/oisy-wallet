import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenSpl, isTokenSplToggleable } from '$sol/utils/spl.utils';

describe('spl.utils', () => {
	describe('isTokenSpl', () => {
		it.each(SPL_TOKENS)('should return true for SPL token $id', (token) => {
			expect(isTokenSpl(token)).toBeTruthy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS
		])('should return false for token $id', (token) => {
			expect(isTokenSpl(token)).toBeFalsy();
		});
	});

	describe('isTokenSplToggleable', () => {
		describe('without enabled field', () => {
			it.each(SPL_TOKENS)('should return false for SPL token $id', (token) => {
				expect(isTokenSplToggleable(token)).toBeFalsy();
			});

			it.each([
				ICP_TOKEN,
				...SUPPORTED_BITCOIN_TOKENS,
				...SUPPORTED_ETHEREUM_TOKENS,
				...SUPPORTED_EVM_TOKENS,
				...SUPPORTED_SOLANA_TOKENS,
				...ERC20_TWIN_TOKENS,
				...EVM_ERC20_TOKENS
			])('should return false for token $id', (token) => {
				expect(isTokenSplToggleable(token)).toBeFalsy();
			});
		});

		describe('with enabled field', () => {
			it.each(
				SPL_TOKENS.map((token) => ({
					...token,
					enabled: Math.random() < 0.5
				}))
			)('should return true for SPL token $id', (token) => {
				expect(isTokenSplToggleable(token)).toBeTruthy();
			});

			it.each(
				[
					ICP_TOKEN,
					...SUPPORTED_BITCOIN_TOKENS,
					...SUPPORTED_ETHEREUM_TOKENS,
					...SUPPORTED_EVM_TOKENS,
					...SUPPORTED_SOLANA_TOKENS,
					...ERC20_TWIN_TOKENS,
					...EVM_ERC20_TOKENS
				].map((token) => ({
					...token,
					enabled: Math.random() < 0.5
				}))
			)('should return false for token $id', (token) => {
				expect(isTokenSplToggleable(token)).toBeFalsy();
			});
		});
	});
});
