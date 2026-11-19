import { BTC_MAINNET_TOKEN } from '$env/tokens/tokens.btc.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { SOLANA_TOKEN } from '$env/tokens/tokens.sol.env';
import {
	hasSeenTipWelcome,
	rememberTipWelcomeSeen,
	tipFees,
	tippableTokens
} from '$lib/utils/tip.utils';
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

	describe('the post-claim welcome', () => {
		const alice = 'aaaaa-aa';
		const bob = 'bbbbb-bb';

		beforeEach(() => {
			localStorage.clear();
		});

		it('is unseen until it is remembered', () => {
			expect(hasSeenTipWelcome(alice)).toBeFalsy();

			rememberTipWelcomeSeen(alice);

			expect(hasSeenTipWelcome(alice)).toBeTruthy();
		});

		it('is remembered per principal', () => {
			// One browser, several claimers — a house tablet passed between staff.
			// A single flag would burn the intro on whoever claimed first.
			rememberTipWelcomeSeen(alice);

			expect(hasSeenTipWelcome(alice)).toBeTruthy();
			expect(hasSeenTipWelcome(bob)).toBeFalsy();
		});

		it('counts as seen when storage cannot be read', () => {
			// Some privacy modes throw instead of returning. A claimer who cannot be
			// remembered would otherwise meet the same intro on every claim, so the
			// unreadable case errs towards silence.
			const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
				throw new Error('denied');
			});

			expect(hasSeenTipWelcome(alice)).toBeTruthy();

			spy.mockRestore();
		});

		it('does not throw when storage cannot be written', () => {
			const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
				throw new Error('full');
			});

			expect(() => rememberTipWelcomeSeen(alice)).not.toThrow();

			spy.mockRestore();
		});
	});
});
