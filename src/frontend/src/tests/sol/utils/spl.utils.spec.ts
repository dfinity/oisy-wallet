import { PEPE_TOKEN } from '$env/tokens/tokens-erc20/tokens.pepe.env';
import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import {
	SOLANA_DEVNET_TOKEN,
	SOLANA_LOCAL_TOKEN,
	SOLANA_TESTNET_TOKEN,
	SOLANA_TOKEN
} from '$env/tokens/tokens.sol.env';
import { SPL_TOKENS } from '$env/tokens/tokens.spl.env';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { describe } from 'vitest';

describe('spl.utils', () => {
	describe('isTokenSpl', () => {
		it.each(SPL_TOKENS)('should return true for SPL token $id', (token) => {
			expect(isTokenSpl(token)).toBe(true);
		});

		it.each([SOLANA_TOKEN, SOLANA_TESTNET_TOKEN, SOLANA_DEVNET_TOKEN, SOLANA_LOCAL_TOKEN])(
			'should return false for SOLANA token $id',
			(token) => {
				expect(isTokenSpl(token)).toBe(false);
			}
		);

		it.each([ETHEREUM_TOKEN, SEPOLIA_TOKEN, ICP_TOKEN, BTC_MAINNET_TOKEN, USDC_TOKEN, PEPE_TOKEN])(
			'should return false for non-SPL token $id',
			(token) => {
				expect(isTokenSpl(token)).toBe(false);
			}
		);
	});
});
