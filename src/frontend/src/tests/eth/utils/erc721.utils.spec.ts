import { AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN } from '$tests/mocks/erc721-tokens.mock';
import { isTokenErc721, isTokenErc721CustomToken } from '$eth/utils/erc721.utils';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SUPPORTED_BITCOIN_TOKENS } from '$env/tokens/tokens.btc.env';
import { SUPPORTED_ETHEREUM_TOKENS } from '$env/tokens/tokens.eth.env';
import { SUPPORTED_EVM_TOKENS } from '$env/tokens/tokens-evm/tokens.evm.env';
import { SUPPORTED_SOLANA_TOKENS } from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { ERC20_TWIN_TOKENS } from '$env/tokens/tokens.erc20.env';
import { EVM_ERC20_TOKENS } from '$env/tokens/tokens-evm/tokens.erc20.env';

describe('erc721.utils', () => {
	describe('isTokenErc721UserToken', () => {
		const tokens = [AZUKI_ELEMENTAL_BEANS_TOKEN, DE_GODS_TOKEN]

		it.each(tokens.map((token) => ({
			...token,
			enabled: Math.random() < 0.5
		}))
		)('should return true for token $name that has the enabled field', (token) => {
			expect(isTokenErc721CustomToken(token)).toBeTruthy();
		});

		it.each(tokens)(
			'should return false for token $name that has not the enabled field',
			(token) => {
				expect(isTokenErc721CustomToken(token)).toBeFalsy();
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
			expect(isTokenErc721CustomToken(token)).toBeFalsy();
		});
	})

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