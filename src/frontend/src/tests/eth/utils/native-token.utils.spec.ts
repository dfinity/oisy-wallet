import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenEthereumNative } from '$eth/utils/native-token.utils';

describe('native-token.utils', () => {
	describe('isTokenEthereumNative', () => {
		it.each([...SUPPORTED_ETHEREUM_TOKENS, ...SUPPORTED_EVM_TOKENS])(
			'should return true for token $name',
			(token) => {
				expect(isTokenEthereumNative(token)).toBeTruthy();
			}
		);

		it.each([...ERC20_TWIN_TOKENS, ...EVM_ERC20_TOKENS])(
			'should return false for token $name',
			(token) => {
				expect(isTokenEthereumNative(token)).toBeFalsy();
			}
		);

		it.each([ICP_TOKEN, ...SUPPORTED_BITCOIN_TOKENS, ...SUPPORTED_SOLANA_TOKENS, ...SPL_TOKENS])(
			'should return false for token $name',
			(token) => {
				expect(isTokenEthereumNative(token)).toBeFalsy();
			}
		);
	});
});
