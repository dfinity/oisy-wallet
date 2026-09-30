import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { mockRlusdCurrencyCode, mockRlusdIssuer } from '$tests/mocks/xrp.mock';
import {
	isTokenXrpTrustLine,
	isTokenXrpTrustLineCustomToken,
	parseXrpCurrencyCode,
	parseXrpTokenValue,
	xrpCurrencyCodeToSymbol,
	xrpIssuerPowers,
	xrpTrustLineIdentifier
} from '$xrp/utils/xrp-trust-line.utils';

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
