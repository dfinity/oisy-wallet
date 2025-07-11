import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenErc721 } from '$eth/utils/erc721.utils';
import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';

describe('erc721.utils', () => {
	describe('isTokenErc721', () => {
		it.each([AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN])(
			'should return true for token $name',
			(token) => {
				expect(isTokenErc721(token)).toBeTruthy();
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
			...EVM_ERC20_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc721(token)).toBeFalsy();
		});
	});
});
