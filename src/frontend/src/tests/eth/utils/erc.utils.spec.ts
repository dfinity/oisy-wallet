import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenErc } from '$eth/utils/erc.utils';
import { MOCK_ERC1155_TOKENS } from '$tests/mocks/erc1155-tokens.mock';
import { MOCK_ERC721_TOKENS } from '$tests/mocks/erc721-tokens.mock';

describe('erc.utils', () => {
	describe('isTokenErc', () => {
		it.each([
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...MOCK_ERC721_TOKENS,
			...MOCK_ERC1155_TOKENS
		])('should return true for token $name', (token) => {
			expect(isTokenErc(token)).toBeTruthy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc(token)).toBeFalsy();
		});
	});
});
