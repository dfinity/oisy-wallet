import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { tippableTokens } from '$lib/utils/tip.utils';
import { mockValidIcToken } from '$tests/mocks/ic-tokens.mock';

describe('tip.utils', () => {
	describe('tippableTokens', () => {
		it('keeps ICP and ICRC tokens', () => {
			const result = tippableTokens([ICP_TOKEN, mockValidIcToken]);

			expect(result).toHaveLength(2);
			expect(result.map(({ symbol }) => symbol)).toContain(ICP_TOKEN.symbol);
		});

		it('drops every native-chain token', () => {
			// Not a product preference: these ledgers have no allowance primitive, so
			// a tip in them would require the canister to hold the funds — the one
			// thing the design rules out. Offering them in the picker would produce a
			// flow that can only fail at the approve.
			expect(tippableTokens([BTC_MAINNET_TOKEN, ETHEREUM_TOKEN, SOLANA_TOKEN])).toEqual([]);
		});

		it('keeps the ledger canister id the approve needs', () => {
			const [token] = tippableTokens([mockValidIcToken]);

			expect(token.ledgerCanisterId).toBe(mockValidIcToken.ledgerCanisterId);
		});

		it('returns nothing for an empty wallet', () => {
			expect(tippableTokens([])).toEqual([]);
		});
	});
});
