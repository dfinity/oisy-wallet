import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { mockRlusdCurrencyCode, mockRlusdIssuer } from '$tests/mocks/xrp.mock';
import {
	fitsXrpTokenPrecision,
	formatXrpTokenValue,
	getXrpTokenMaxAmount,
	getXrpTokenSendMax,
	isTokenXrpTrustLine,
	isTokenXrpTrustLineCustomToken,
	isXrpTokenValueZero,
	parseXrpCurrencyCode,
	parseXrpTokenValue,
	xrpCurrencyCodeToSymbol,
	xrpIssuerPowers,
	xrpTrustLineIdentifier
} from '$xrp/utils/xrp-trust-line.utils';
import { encode } from 'ripple-binary-codec';

describe('xrp-trust-line.utils', () => {
	describe('isTokenXrpTrustLine', () => {
		it('recognises a trust-line token and nothing else', () => {
			expect(isTokenXrpTrustLine(RLUSD_TOKEN)).toBeTruthy();
			expect(isTokenXrpTrustLine(XRP_TOKEN)).toBeFalsy();
		});
	});

	describe('isTokenXrpTrustLineCustomToken', () => {
		it('needs a trust-line token with an enabled state', () => {
			const hiddenRlusd: Token = { ...RLUSD_TOKEN, enabled: false } as Token;
			const shownXrp: Token = { ...XRP_TOKEN, enabled: true } as Token;

			expect(isTokenXrpTrustLineCustomToken(hiddenRlusd)).toBeTruthy();
			expect(isTokenXrpTrustLineCustomToken(RLUSD_TOKEN)).toBeFalsy();
			expect(isTokenXrpTrustLineCustomToken(shownXrp)).toBeFalsy();
		});
	});

	describe('xrpTrustLineIdentifier', () => {
		it('joins the currency code and the issuer the way CoinGecko keys XRPL tokens', () => {
			expect(
				xrpTrustLineIdentifier({ currency: mockRlusdCurrencyCode, issuer: mockRlusdIssuer })
			).toBe(`${mockRlusdCurrencyCode}.${mockRlusdIssuer}`);
		});
	});

	describe('xrpCurrencyCodeToSymbol', () => {
		it.each([
			{ name: 'a standard code', code: 'USD', expected: 'USD' },
			{ name: "RLUSD's padded ASCII", code: mockRlusdCurrencyCode, expected: 'RLUSD' },
			{
				name: 'an AMM LP-token code, which is not text',
				code: '03B20F3A7D26D33C6DA3503E5CCE3E67B102D4DF',
				expected: '03B20F3A…'
			},
			{
				name: 'ASCII that is not padded at the end',
				code: '4C4F4E474552434F44454E414D455748494348', // 38 hex: not a 40-hex code
				expected: '4C4F4E474552434F44454E414D455748494348'
			}
		])('shows $name as $expected', ({ code, expected }) => {
			expect(xrpCurrencyCodeToSymbol(code)).toBe(expected);
		});
	});

	describe('parseXrpTokenValue', () => {
		it.each([
			{ value: '0', expected: ZERO },
			{ value: '1', expected: 10n ** 18n },
			{ value: '1.5', expected: 15n * 10n ** 17n },
			{ value: '0.00204230364', expected: 2_042_303_640_000_000n },
			{ value: '-0.035783526070515', expected: -35_783_526_070_515_000n },
			// 58 × 10^14 × 10^13, in base units of 10^-18.
			{ value: '5800000000000000e13', expected: 58n * 10n ** 45n },
			{ value: '1000000000000000e-3', expected: 10n ** 30n },
			{ value: '1.23E2', expected: 123n * 10n ** 18n },
			{ value: '.5', expected: 5n * 10n ** 17n }
		])('converts $value exactly', ({ value, expected }) => {
			expect(parseXrpTokenValue({ value })).toBe(expected);
		});

		it('truncates digits beyond the scale toward zero, never up', () => {
			expect(parseXrpTokenValue({ value: '0.0000000000000000019' })).toBe(1n);
			expect(parseXrpTokenValue({ value: '-0.0000000000000000019' })).toBe(-1n);
			expect(parseXrpTokenValue({ value: '1e-81' })).toBe(ZERO);
		});

		it('converts to the scale it is given', () => {
			expect(parseXrpTokenValue({ value: '2.5', decimals: 6 })).toBe(2_500_000n);
		});

		// For a figure that must not be understated, such as a recipient's balance under its limit.
		it('rounds the magnitude up when asked, only when digits are dropped', () => {
			expect(parseXrpTokenValue({ value: '0.0000000000000000011', roundUp: true })).toBe(2n);
			expect(parseXrpTokenValue({ value: '-0.0000000000000000011', roundUp: true })).toBe(-2n);
			expect(parseXrpTokenValue({ value: '1e-81', roundUp: true })).toBe(1n);
			expect(parseXrpTokenValue({ value: '0.000000000000000001', roundUp: true })).toBe(1n);
			expect(parseXrpTokenValue({ value: '0.0000000000000000010', roundUp: true })).toBe(1n);
		});

		it.each(['', '.', 'e5', '1.2.3', '0x10', '1e', 'abc', ' 1'])(
			'throws for %j, which is no amount',
			(value) => {
				expect(() => parseXrpTokenValue({ value })).toThrow('Invalid XRP Ledger token amount');
			}
		);

		it('throws for an exponent far outside the ledger range', () => {
			expect(() => parseXrpTokenValue({ value: '1e1000' })).toThrow('out of range');
		});
	});

	describe('isXrpTokenValueZero', () => {
		it.each(['0', '0.0', '-0', '+0', '.0', '0.', '0e-15', '0000e5'])(
			'reads %s as zero',
			(value) => {
				expect(isXrpTokenValueZero(value)).toBeTruthy();
			}
		);

		// Dust below the wallet's 18 decimals is not zero for the ledger, which keeps the line.
		it.each(['1', '-0.5', '1e-20', '0.000000000000000000001', '5800000000000000e13'])(
			'reads %s as not zero',
			(value) => {
				expect(isXrpTokenValueZero(value)).toBeFalsy();
			}
		);

		it.each(['', '-', '.', 'e5', 'abc', '0x0'])('reads the malformed %s as not zero', (value) => {
			expect(isXrpTokenValueZero(value)).toBeFalsy();
		});
	});

	describe('formatXrpTokenValue', () => {
		it.each([
			{ amount: ZERO, expected: '0' },
			{ amount: 10n ** 18n, expected: '1' },
			{ amount: 25n * 10n ** 18n, expected: '25' },
			{ amount: 15n * 10n ** 17n, expected: '1.5' },
			{ amount: 1n, expected: '0.000000000000000001' },
			{ amount: 2_042_303_640_000_000n, expected: '0.00204230364' },
			{ amount: -35_783_526_070_515_000n, expected: '-0.035783526070515' },
			{ amount: 58n * 10n ** 45n, expected: `58${'0'.repeat(27)}` }
		])('states $amount base units as $expected', ({ amount, expected }) => {
			expect(formatXrpTokenValue({ amount })).toBe(expected);
		});

		it('reads back as the amount it states', () => {
			const amount = 1_234_567_890_123_456n;

			expect(parseXrpTokenValue({ value: formatXrpTokenValue({ amount }) })).toBe(amount);
		});

		it('states the scale it is given', () => {
			expect(formatXrpTokenValue({ amount: 2_500_000n, decimals: 6 })).toBe('2.5');
		});
	});

	describe('fitsXrpTokenPrecision', () => {
		it.each([
			{ name: 'a whole amount', amount: 25n * 10n ** 18n },
			{ name: 'the smallest base unit', amount: 1n },
			{ name: '16 significant digits', amount: 1_234_567_890_123_456n * 10n ** 2n },
			{ name: 'a large amount with few digits', amount: 9n * 10n ** 60n }
		])('takes $name', ({ amount }) => {
			expect(fitsXrpTokenPrecision(amount)).toBeTruthy();
		});

		it('refuses a 17th significant digit', () => {
			expect(fitsXrpTokenPrecision(12_345_678_901_234_567n)).toBeFalsy();
		});

		// The rule is the codec's own: what fits encodes, what does not throws.
		it('agrees with ripple-binary-codec at the boundary', () => {
			const payment = (amount: bigint) => ({
				TransactionType: 'Payment',
				Account: 'rLUEXYuLiQptky37CqLcm9USQpPiz5rkpD',
				Destination: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
				Amount: {
					currency: mockRlusdCurrencyCode,
					issuer: mockRlusdIssuer,
					value: formatXrpTokenValue({ amount })
				},
				Fee: '12',
				Sequence: 1
			});

			const fits = 1_234_567_890_123_456n;
			const tooLong = 12_345_678_901_234_567n;

			expect(fitsXrpTokenPrecision(fits)).toBeTruthy();
			expect(() => encode(payment(fits))).not.toThrow();
			expect(fitsXrpTokenPrecision(tooLong)).toBeFalsy();
			expect(() => encode(payment(tooLong))).toThrow('Decimal precision out of range');
		});
	});

	describe('getXrpTokenSendMax', () => {
		it.each([1_000_000_000, 0])('is undefined without a fee (rate %i)', (transferRate) => {
			expect(getXrpTokenSendMax({ amount: 10n ** 18n, transferRate })).toBeUndefined();
		});

		it('adds the fee to the amount', () => {
			// A 0.5 % fee on 100.
			expect(getXrpTokenSendMax({ amount: 100n * 10n ** 18n, transferRate: 1_005_000_000 })).toBe(
				1005n * 10n ** 17n
			);
		});

		it('rounds the cost up, never down', () => {
			// 1 base unit at 0.5 % costs 1.005 units, so 2.
			expect(getXrpTokenSendMax({ amount: 1n, transferRate: 1_005_000_000 })).toBe(2n);
		});

		// 1.234567890123456 at 0.2 % costs exactly 1.237037025903702912 — 19 digits, one past what the
		// ledger can state, so the cost is rounded up at the 16th.
		it('rounds the cost up to a figure the ledger can state', () => {
			expect(
				getXrpTokenSendMax({
					amount: 1_234_567_890_123_456n * 10n ** 3n,
					transferRate: 1_002_000_000
				})
			).toBe(1_237_037_025_903_703_000n);
		});
	});

	describe('getXrpTokenMaxAmount', () => {
		it('sends the whole balance without a fee', () => {
			expect(
				getXrpTokenMaxAmount({ balance: 573_115_370_410_000_000n, transferRate: 1_000_000_000 })
			).toBe(573_115_370_410_000_000n);
		});

		it('is zero for no balance', () => {
			expect(getXrpTokenMaxAmount({ balance: ZERO, transferRate: 1_005_000_000 })).toBe(ZERO);
		});

		it('leaves room for the fee', () => {
			// 100.5 at 0.5 % sends 100.
			expect(
				getXrpTokenMaxAmount({ balance: 1005n * 10n ** 17n, transferRate: 1_005_000_000 })
			).toBe(100n * 10n ** 18n);
		});

		it.each([
			{ balance: 573_115_370_410_000_000n, transferRate: 1_002_000_000 },
			{ balance: 1n, transferRate: 1_500_000_000 },
			{ balance: 7n, transferRate: 1_999_999_999 },
			{ balance: 1_234_567_890_123_456_789n, transferRate: 1_000_000_001 },
			{ balance: 10n ** 40n + 7n, transferRate: 1_250_000_000 }
		])(
			'sends the most whose cost still fits $balance at rate $transferRate',
			({ balance, transferRate }) => {
				const max = getXrpTokenMaxAmount({ balance, transferRate });

				const cost = (amount: bigint) => getXrpTokenSendMax({ amount, transferRate }) ?? amount;

				// The next amount the ledger can state above it.
				const step = 10n ** BigInt(Math.max(max.toString().length - 16, 0));

				expect(fitsXrpTokenPrecision(max)).toBeTruthy();
				expect(max === ZERO || cost(max) <= balance).toBeTruthy();
				expect(cost(max + step)).toBeGreaterThan(balance);
			}
		);
	});

	describe('parseXrpCurrencyCode', () => {
		it.each([
			{ name: 'a standard code', input: 'USD', expected: 'USD' },
			{ name: 'a standard code, case kept', input: 'usd', expected: 'usd' },
			{ name: 'a standard code with a symbol', input: '$$$', expected: '$$$' },
			{ name: 'a 40-hex code', input: mockRlusdCurrencyCode, expected: mockRlusdCurrencyCode },
			{
				name: 'a 40-hex code in lowercase, as the ledger writes it: uppercase',
				input: mockRlusdCurrencyCode.toLowerCase(),
				expected: mockRlusdCurrencyCode
			},
			{
				name: 'a name, zero-padded the way RLUSD is',
				input: 'RLUSD',
				expected: mockRlusdCurrencyCode
			},
			{ name: 'surrounding whitespace', input: '  RLUSD ', expected: mockRlusdCurrencyCode },
			{
				name: 'a 20-character name, which fills all 160 bits',
				input: 'ABCDEFGHIJKLMNOPQRST',
				expected: '4142434445464748494A4B4C4D4E4F5051525354'
			}
		])('reads $name', ({ input, expected }) => {
			expect(parseXrpCurrencyCode(input)).toBe(expected);
		});

		it.each([
			{ name: 'XRP, the ledger’s own currency', input: 'XRP' },
			{ name: 'a standard code with an unsupported character', input: 'U-D' },
			{ name: 'a 40-hex code with a leading zero byte', input: `00${'1'.repeat(38)}` },
			{ name: '40 characters that are not hex', input: 'G'.repeat(40) },
			{ name: 'a name longer than 20 characters', input: 'A'.repeat(21) },
			{ name: 'a name with a character outside printable ASCII', input: 'RLUSÐ' },
			{ name: 'fewer than 3 characters', input: 'US' },
			{ name: 'nothing', input: '' }
		])('refuses $name', ({ input }) => {
			expect(parseXrpCurrencyCode(input)).toBeUndefined();
		});
	});

	describe('xrpIssuerPowers', () => {
		// RLUSD's issuer, measured: Clawback, DepositAuth, DefaultRipple, DisableMaster, DisallowXRP and
		// RequireDestTag; not NoFreeze, not RequireAuth, no TransferRate.
		const RLUSD_ISSUER_FLAGS = 0x819a0000;

		it('lists exactly freeze and clawback for the RLUSD issuer', () => {
			expect(xrpIssuerPowers({ flags: RLUSD_ISSUER_FLAGS })).toEqual([
				{ type: 'freeze' },
				{ type: 'clawback' }
			]);
		});

		it('omits freeze once the issuer gave it up', () => {
			expect(xrpIssuerPowers({ flags: 0x00200000 | 0x00800000 })).toEqual([]);
		});

		it('states a global freeze in place', () => {
			expect(xrpIssuerPowers({ flags: 0x00400000 | 0x00800000 })).toEqual([
				{ type: 'freeze' },
				{ type: 'global_freeze' }
			]);
		});

		it('states that the issuer must approve holders', () => {
			expect(xrpIssuerPowers({ flags: 0x00200000 | 0x00800000 | 0x00040000 })).toEqual([
				{ type: 'approval' }
			]);
		});

		it('states a transfer fee as a percentage', () => {
			expect(
				xrpIssuerPowers({ flags: 0x00200000 | 0x00800000, transferRate: 1_005_000_000 })
			).toEqual([{ type: 'transfer_fee', percent: 0.5 }]);
		});

		it('states no transfer fee for a rate of 1', () => {
			expect(
				xrpIssuerPowers({ flags: 0x00200000 | 0x00800000, transferRate: 1_000_000_000 })
			).toEqual([]);
		});

		it('states that holders cannot send the token to each other without DefaultRipple', () => {
			expect(xrpIssuerPowers({ flags: 0x00200000 })).toEqual([{ type: 'no_rippling' }]);
		});
	});
});
