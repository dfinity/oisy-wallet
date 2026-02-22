import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { ERC4626_TOKENS } from '$env/tokens/tokens.erc4626.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenErc4626, isTokenErc4626CustomToken } from '$eth/utils/erc4626.utils';
import { MOCK_ERC1155_TOKENS } from '$tests/mocks/erc1155-tokens.mock';
import { MOCK_ERC721_TOKENS } from '$tests/mocks/erc721-tokens.mock';

describe('erc4626.utils', () => {
	describe('isTokenErc4626', () => {
		it.each(ERC4626_TOKENS)('should return true for token $name', (token) => {
			expect(isTokenErc4626(token)).toBeTruthy();
		});

		it.each([
			ICP_TOKEN,
			...SUPPORTED_BITCOIN_TOKENS,
			...SUPPORTED_ETHEREUM_TOKENS,
			...SUPPORTED_EVM_TOKENS,
			...SUPPORTED_SOLANA_TOKENS,
			...SPL_TOKENS,
			...ERC20_TWIN_TOKENS,
			...EVM_ERC20_TOKENS,
			...MOCK_ERC721_TOKENS,
			...MOCK_ERC1155_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc4626(token)).toBeFalsy();
		});
	});

	describe('isTokenErc4626CustomToken', () => {
		it.each(
			ERC4626_TOKENS.map((token) => ({
				...token,
				enabled: Math.random() < 0.5
			}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenErc4626CustomToken(token)).toBeTruthy();
		});

		it.each(ERC4626_TOKENS)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenErc4626CustomToken(token)).toBeFalsy();
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
			...MOCK_ERC721_TOKENS,
			...MOCK_ERC1155_TOKENS
		])('should return false for token $name', (token) => {
			expect(isTokenErc4626CustomToken(token)).toBeFalsy();
		});
	});
});
