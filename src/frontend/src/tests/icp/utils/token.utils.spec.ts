import { USDC_TOKEN } from '$env/tokens/tokens-erc20/tokens.usdc.env';
import { BONK_TOKEN } from '$env/tokens/tokens-spl/tokens.bonk.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { getTokenFee } from '$icp/utils/token.utils';
import { ZERO } from '$lib/constants/app.constants';
import { mockValidExtV2Token } from '$tests/mocks/ext-tokens.mock';
import { mockValidDip20Token, mockValidIcCkToken } from '$tests/mocks/ic-tokens.mock';

describe('token.utils', () => {
	describe('getTokenFee', () => {
		it('should return the token fee for ICP tokens', () => {
			expect(getTokenFee(ICP_TOKEN)).toBe(ICP_TOKEN.fee);
		});

		it('should return the token fee for ICRC tokens', () => {
			expect(getTokenFee(mockValidIcCkToken)).toBe(mockValidIcCkToken.fee);
		});

		it('should return the token fee for DIP20 tokens', () => {
			expect(getTokenFee(mockValidDip20Token)).toBe(mockValidDip20Token.fee);
		});

		it('should return zero for EXT tokens', () => {
			expect(getTokenFee(mockValidExtV2Token)).toBe(ZERO);
		});

		it('should return undefined for other token standards', () => {
			expect(getTokenFee(BONK_TOKEN)).toBeUndefined();

			expect(getTokenFee(USDC_TOKEN)).toBeUndefined();

			expect(getTokenFee(BTC_MAINNET_TOKEN)).toBeUndefined();

			expect(getTokenFee(ETHEREUM_TOKEN)).toBeUndefined();

			expect(getTokenFee(SOLANA_TOKEN)).toBeUndefined();
		});
	});
});
