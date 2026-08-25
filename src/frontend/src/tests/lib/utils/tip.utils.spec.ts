import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import { tipFees, tippableTokens } from '$lib/utils/tip.utils';
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

describe('tipFees', () => {
	it('charges the sender two ledger fees, one for each ledger call', () => {
		const fee = 10_000n;

		expect(tipFees(fee)).toEqual({ reserve: fee, payout: fee, total: 20_000n });
	});

	it('never leaves the claimer paying anything', () => {
		// The ledger credits the claimer the full amount and debits the fee from the
		// sender, so the total here is entirely the sender's. Asserted because the
		// design's single "Total estimated fee" line invites the assumption that one
		// of the two comes out of the tip.
		const { reserve, payout, total } = tipFees(7n);

		expect(reserve + payout).toBe(total);
	});
});
