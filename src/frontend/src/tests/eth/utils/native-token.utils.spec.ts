import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import {
	ETHEREUM_TOKEN,
	SEPOLIA_TOKEN,
	SUPPORTED_ETHEREUM_TOKENS
} from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { findNativeEthereumToken, isTokenEthereumNative } from '$eth/utils/native-token.utils';

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

	describe('findNativeEthereumToken', () => {
		it('should find the native token of the given network', () => {
			const nativeTokens = [ETHEREUM_TOKEN, SEPOLIA_TOKEN];

			expect(findNativeEthereumToken({ nativeTokens, networkId: SEPOLIA_TOKEN.network.id })).toBe(
				SEPOLIA_TOKEN
			);
			expect(findNativeEthereumToken({ nativeTokens, networkId: ETHEREUM_TOKEN.network.id })).toBe(
				ETHEREUM_TOKEN
			);
		});

		it('should find nothing when that network is not enabled', () => {
			expect(
				findNativeEthereumToken({
					nativeTokens: [ETHEREUM_TOKEN],
					networkId: SEPOLIA_TOKEN.network.id
				})
			).toBeUndefined();
		});
	});
});
