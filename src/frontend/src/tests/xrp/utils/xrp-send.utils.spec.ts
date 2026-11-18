import { ZERO } from '$lib/constants/app.constants';
import { mockXrpTrustLine } from '$tests/mocks/xrp.mock';
import type { XrpTrustLine } from '$xrp/types/xrp-trust-line';
import {
	getXrpMaxAmount,
	getXrpReserveDrops,
	isInvalidDestinationXrp,
	isXrpAmountSendable,
	xrpPaymentNeedsDepositPreauth,
	xrpTokenPaymentRefusal
} from '$xrp/utils/xrp-send.utils';

// Expected values are literals, not the constants or arithmetic these functions use. Restating the
// implementation's own expression makes a test immune to the mistake it exists to catch: a wrong
// reserve constant, or a changed operator, alters both sides equally and the test still passes.
// These numbers come from the network's published reserve — 1 XRP base, 0.2 XRP per owned object.
describe('xrp-send.utils', () => {
	describe('getXrpReserveDrops', () => {
		it('is the base reserve for an account owning nothing', () => {
			expect(getXrpReserveDrops({ ownerCount: 0 })).toBe(1_000_000n);
		});

		// An account holding ledger objects must retain more than the base reserve.
		it.each([
			{ ownerCount: 1, expected: 1_200_000n },
			{ ownerCount: 3, expected: 1_600_000n },
			{ ownerCount: 17, expected: 4_400_000n }
		])('adds the owner reserve per owned object ($ownerCount)', ({ ownerCount, expected }) => {
			expect(getXrpReserveDrops({ ownerCount })).toBe(expected);
		});
	});

	describe('getXrpMaxAmount', () => {
		it('subtracts the fee and the base reserve from the balance', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n, ownerCount: 0 })).toBe(3_999_990n);
		});

		// Spending down to the base reserve would leave an owning account short and the
		// transaction would fail on submit.
		it('also subtracts the owner reserve for owned objects', () => {
			expect(getXrpMaxAmount({ balance: 5_000_000n, fee: 10n, ownerCount: 2 })).toBe(3_599_990n);
		});

		it('clamps to zero when the balance cannot cover fee + reserve', () => {
			expect(getXrpMaxAmount({ balance: 500_000n, fee: 10n, ownerCount: 0 })).toBe(ZERO);
		});

		it('clamps to zero when the owner reserve alone exceeds the balance', () => {
			expect(getXrpMaxAmount({ balance: 1_500_000n, fee: 10n, ownerCount: 5 })).toBe(ZERO);
		});
	});

	describe('isInvalidDestinationXrp', () => {
		it('is false for a valid classic address', () => {
			expect(isInvalidDestinationXrp('rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD')).toBeFalsy();
		});

		it('is true for a malformed destination', () => {
			expect(isInvalidDestinationXrp('not-an-address')).toBeTruthy();
		});

		// Unfilled is not invalid, and required-field validation belongs to the form. The three peer
		// validators — Sol, Btc, ICP — all answer `false` here, so answering `true` for one chain
		// would hand any consumer without its own length gate a different answer for XRP.
		it.each([undefined, ''])('is false for the unfilled destination %j', (destination) => {
			expect(isInvalidDestinationXrp(destination)).toBeFalsy();
		});
	});

	// The form validates against the fee and reserve as they were when the amount was typed, and
	// `TokenInputContent` revalidates on amount/token change only — so the fee poller can raise the
	// requirement underneath an accepted amount. This is the guard re-applied at send time.
	describe('isXrpAmountSendable', () => {
		const balance = 5_000_000n;
		const reserve = getXrpReserveDrops({ ownerCount: 0 });

		it('accepts an amount that leaves the fee and the reserve', () => {
			expect(
				isXrpAmountSendable({ amount: balance - 10n - reserve, balance, fee: 10n, reserve })
			).toBeTruthy();
		});

		it('refuses an amount one drop above the sendable maximum', () => {
			expect(
				isXrpAmountSendable({ amount: balance - 10n - reserve + 1n, balance, fee: 10n, reserve })
			).toBeFalsy();
		});

		// The reported case: valid when typed at the base fee, invalid after escalation.
		it('refuses an amount that was valid before the fee grew', () => {
			const amount = balance - 10n - reserve;

			expect(isXrpAmountSendable({ amount, balance, fee: 10n, reserve })).toBeTruthy();
			expect(isXrpAmountSendable({ amount, balance, fee: 5_000n, reserve })).toBeFalsy();
		});

		it('refuses an amount that was valid before the reserve grew', () => {
			const amount = balance - 10n - reserve;

			expect(isXrpAmountSendable({ amount, balance, fee: 10n, reserve })).toBeTruthy();
			expect(
				isXrpAmountSendable({
					amount,
					balance,
					fee: 10n,
					reserve: getXrpReserveDrops({ ownerCount: 3 })
				})
			).toBeFalsy();
		});

		it('refuses any positive amount when the reserve already exceeds the balance', () => {
			expect(isXrpAmountSendable({ amount: 1n, balance: reserve, fee: 10n, reserve })).toBeFalsy();
		});
	});

	describe('xrpPaymentNeedsDepositPreauth', () => {
		// `lsfDepositAuth`, as RLUSD's issuer sets it among its flags `0x819a0000`.
		const depositAuth = 0x01000000;

		it('is false for a recipient without DepositAuth', () => {
			expect(
				xrpPaymentNeedsDepositPreauth({
					destinationFlags: 0x80800000,
					destinationBalance: 50_000_000n,
					xrpAmount: 25_000_000n
				})
			).toBeFalsy();
		});

		it('is true for a token payment to a recipient with it, whatever the amounts', () => {
			expect(
				xrpPaymentNeedsDepositPreauth({ destinationFlags: 0x819a0000, destinationBalance: ZERO })
			).toBeTruthy();
		});

		it('is true for an XRP payment above the base reserve', () => {
			expect(
				xrpPaymentNeedsDepositPreauth({
					destinationFlags: depositAuth,
					destinationBalance: ZERO,
					xrpAmount: 1_000_001n
				})
			).toBeTruthy();
		});

		it('is true for an XRP payment to a recipient holding more than the base reserve', () => {
			expect(
				xrpPaymentNeedsDepositPreauth({
					destinationFlags: depositAuth,
					destinationBalance: 1_000_001n,
					xrpAmount: 1n
				})
			).toBeTruthy();
		});

		// rippled lets this through, so an account with DepositAuth cannot lock itself out of XRP.
		it('is false for an XRP payment and a recipient balance both at most the base reserve', () => {
			expect(
				xrpPaymentNeedsDepositPreauth({
					destinationFlags: depositAuth,
					destinationBalance: 1_000_000n,
					xrpAmount: 1_000_000n
				})
			).toBeFalsy();
		});
	});

	describe('xrpTokenPaymentRefusal', () => {
		// 12.5 RLUSD in base units of 10^-18.
		const balance = 125n * 10n ** 17n;

		const line = (overrides: Partial<XrpTrustLine> = {}): XrpTrustLine => ({
			...mockXrpTrustLine,
			...overrides
		});

		// A payment of 1 RLUSD between two holders with clean lines.
		const params = {
			amount: 10n ** 18n,
			cost: 10n ** 18n,
			senderLine: line(),
			recipientLine: line({ balance: '0' }),
			toIssuer: false,
			issuerFlags: 0x80800000,
			destinationFlags: 0
		};

		it('lets a payment through clean lines', () => {
			expect(xrpTokenPaymentRefusal(params)).toBeUndefined();
		});

		it.each([
			{ name: 'no line', senderLine: undefined },
			{ name: 'a balance below the cost', senderLine: line({ balance: '0.5' }) }
		])('refuses a sender with $name', ({ senderLine }) => {
			expect(xrpTokenPaymentRefusal({ ...params, senderLine })).toBe('insufficient_token_balance');
		});

		// The transfer fee is part of what the sender pays.
		it('measures the balance against the cost, not the amount', () => {
			expect(xrpTokenPaymentRefusal({ ...params, amount: balance, cost: balance + 1n })).toBe(
				'insufficient_token_balance'
			);
			expect(xrpTokenPaymentRefusal({ ...params, amount: balance, cost: balance })).toBeUndefined();
		});

		it.each([
			{
				name: 'the issuer froze the line',
				overrides: { senderLine: line({ freezePeer: true }) },
				refusal: 'frozen'
			},
			{
				name: 'the issuer froze every holder',
				overrides: { issuerFlags: 0x80c00000 },
				refusal: 'frozen'
			},
			{
				name: 'the issuer deep-froze the line',
				overrides: { senderLine: line({ freezePeer: true, deepFreezePeer: true }) },
				refusal: 'deep_frozen'
			},
			{
				name: 'the recipient has no line',
				overrides: { recipientLine: undefined },
				refusal: 'no_trust_line'
			},
			{
				name: 'the issuer deep-froze the recipient',
				overrides: { recipientLine: line({ balance: '0', deepFreezePeer: true }) },
				refusal: 'destination_frozen'
			},
			{
				name: 'the recipient froze its own side',
				overrides: { recipientLine: line({ balance: '0', freeze: true }) },
				refusal: 'destination_frozen'
			},
			{
				name: 'the recipient froze every holder of its own tokens',
				overrides: { destinationFlags: 0x00400000 },
				refusal: 'destination_frozen'
			},
			{
				name: 'the recipient waits for the issuer approval',
				overrides: { issuerFlags: 0x80840000 },
				refusal: 'destination_not_authorized'
			},
			{
				name: 'the issuer blocks rippling on both lines',
				overrides: {
					senderLine: line({ noRipplePeer: true }),
					recipientLine: line({ balance: '0', noRipplePeer: true })
				},
				refusal: 'no_rippling'
			},
			{
				name: 'the amount goes over the recipient limit',
				overrides: { recipientLine: line({ balance: '999999999.5', limit: '1000000000' }) },
				refusal: 'trust_line_limit'
			}
		])('refuses when $name', ({ overrides, refusal }) => {
			expect(xrpTokenPaymentRefusal({ ...params, ...overrides })).toBe(refusal);
		});

		// An individual freeze lets the recipient receive; only a deep freeze stops it.
		it('lets a payment through to a recipient the issuer froze', () => {
			expect(
				xrpTokenPaymentRefusal({
					...params,
					recipientLine: line({ balance: '0', freezePeer: true })
				})
			).toBeUndefined();
		});

		it('lets a payment through when only one line blocks rippling', () => {
			expect(
				xrpTokenPaymentRefusal({ ...params, senderLine: line({ noRipplePeer: true }) })
			).toBeUndefined();
		});

		it('lets an approved recipient receive from an issuer requiring approval', () => {
			expect(
				xrpTokenPaymentRefusal({
					...params,
					issuerFlags: 0x80840000,
					recipientLine: line({ balance: '0', peerAuthorized: true })
				})
			).toBeUndefined();
		});

		it('takes exactly the room under the limit', () => {
			expect(
				xrpTokenPaymentRefusal({
					...params,
					recipientLine: line({ balance: '999999999', limit: '1000000000' })
				})
			).toBeUndefined();
		});

		// Rounded up, so a balance carrying digits below the wallet's scale cannot make room appear.
		it('does not overstate the room for a balance below the scale', () => {
			expect(
				xrpTokenPaymentRefusal({
					...params,
					recipientLine: line({ balance: '999999999.0000000000000000001', limit: '1000000000' })
				})
			).toBe('trust_line_limit');
		});

		// rippled checks no freeze on a payment back to the issuer, and no other line is involved.
		it.each([
			{ senderLine: line({ freezePeer: true, deepFreezePeer: true }) },
			{ issuerFlags: 0x80c00000 },
			{ recipientLine: undefined }
		])('lets a frozen holder send back to the issuer (%o)', (overrides) => {
			expect(xrpTokenPaymentRefusal({ ...params, toIssuer: true, ...overrides })).toBeUndefined();
		});

		it('still refuses a payment to the issuer the balance cannot cover', () => {
			expect(
				xrpTokenPaymentRefusal({ ...params, toIssuer: true, senderLine: line({ balance: '0.5' }) })
			).toBe('insufficient_token_balance');
		});
	});
});
