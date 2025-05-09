import { isBitcoinToken } from '$btc/utils/token.utils';
import { BASE_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens-base/tokens.erc20.env';
import { BSC_BEP20_TOKENS } from '$env/tokens/tokens-evm/tokens-bsc/tokens.bep20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';

describe('token.utils', () => {
	describe('isBitcoinToken', () => {
		it.each(SUPPORTED_BITCOIN_TOKENS)('should return true for token $name', (token) => {
			expect(isBitcoinToken(token)).toBeTruthy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...ERC20_TWIN_TOKENS,
			...BASE_ERC20_TOKENS,
			...BSC_BEP20_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isBitcoinToken(token)).toBeFalsy();
		});
	});
});
