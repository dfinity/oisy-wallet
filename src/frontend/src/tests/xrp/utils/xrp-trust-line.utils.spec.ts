import { RLUSD_TOKEN } from '$env/tokens/tokens-xrp/tokens.rlusd.env';
import { XRP_TOKEN } from '$env/tokens/tokens.xrp.env';
import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { mockRlusdCurrencyCode, mockRlusdIssuer } from '$tests/mocks/xrp.mock';
import {
	isTokenXrpTrustLine,
	isTokenXrpTrustLineCustomToken,
	parseXrpTokenValue,
	xrpCurrencyCodeToSymbol,
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
});
