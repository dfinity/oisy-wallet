import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { isTokenXrpNative } from '$xrp/utils/token.utils';

describe('token.utils', () => {
	describe('isTokenXrpNative', () => {
		it('returns true for native XRP', () => {
			expect(isTokenXrpNative(XRP_TOKEN)).toBeTruthy();
		});

		it('returns false for the native tokens of other chains', () => {
			for (const token of [BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, SOLANA_TOKEN]) {
				expect(isTokenXrpNative(token)).toBeFalsy();
			}
		});
	});
});
