import { ZERO } from '$lib/constants/app.constants';
import type { Token } from '$lib/types/token';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { XRP_TRUST_LINE_TOKEN_DECIMALS } from '$xrp/constants/xrp.constants';
import type {
	XrpCurrencyCode,
	XrpTrustLineCustomToken,
	XrpTrustLineToken,
	XrpTrustLineTokenIdentity
} from '$xrp/types/xrp-trust-line-token';

export const isTokenXrpTrustLine = (token: Token): token is XrpTrustLineToken =>
	token.standard.code === 'xrp-trust-line';

export const isTokenXrpTrustLineCustomToken = (token: Token): token is XrpTrustLineCustomToken =>
	isTokenXrpTrustLine(token) && isTokenToggleable(token);

/**
 * The key a trust-line token is identified by: its currency code and its issuer together, in the
 * form CoinGecko keys XRP Ledger tokens. The code alone is not unique, since any account can issue
 * a token under any code.
 */
export const xrpTrustLineIdentifier = ({ currency, issuer }: XrpTrustLineTokenIdentity): string =>
	`${currency}.${issuer}`;

const NONSTANDARD_CURRENCY_CODE_LENGTH = 40;

/**
 * The symbol a currency code is shown with. A standard code is its own symbol. A nonstandard code
 * usually carries the ASCII of a longer name, zero-padded, as RLUSD's does, and reads as that name;
 * one that does not — an AMM pool's LP-token code, say — is shown abbreviated rather than decoded
 * into control characters.
 */
export const xrpCurrencyCodeToSymbol = (code: XrpCurrencyCode): string => {
	if (code.length !== NONSTANDARD_CURRENCY_CODE_LENGTH) {
		return code;
	}

	const bytes = (code.match(/../g) ?? []).map((byte) => Number.parseInt(byte, 16));

	// Trailing zero bytes are the padding, not part of the name.
	let end = bytes.length;
	while (end > 0 && bytes[end - 1] === 0) {
		end--;
	}

	const name = bytes.slice(0, end);
	const printable = name.length > 0 && name.every((byte) => byte >= 0x20 && byte <= 0x7e);

	return printable ? String.fromCharCode(...name) : `${code.slice(0, 8)}…`;
};

const XRP_TOKEN_VALUE_PATTERN = /^([+-])?(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

const XRP_TOKEN_VALUE_MAX_EXPONENT = 999;

/**
 * A token amount as the ledger writes it — a decimal string, possibly in exponent notation such as
 * `5800000000000000e13` or `1000000000000000e-3` — in base units of 10^-`decimals`.
 *
 * Exact for every value with at most `decimals` fractional digits; digits beyond are truncated
 * toward zero, never rounded up, so a displayed balance is never more than the ledger holds.
 */
export const parseXrpTokenValue = ({
	value,
	decimals = XRP_TRUST_LINE_TOKEN_DECIMALS
}: {
	value: string;
	decimals?: number;
}): bigint => {
	const match = XRP_TOKEN_VALUE_PATTERN.exec(value);

	if (match === null) {
		throw new Error(`Invalid XRP Ledger token amount: ${value}`);
	}

	const [, sign, integer = '', fraction = '', exponent = '0'] = match;

	// The ledger's own range needs two-digit exponents; the bound keeps a hostile value from making
	// the conversion below allocate without limit.
	if (integer === '' && fraction === '') {
		throw new Error(`Invalid XRP Ledger token amount: ${value}`);
	}

	if (Math.abs(Number(exponent)) > XRP_TOKEN_VALUE_MAX_EXPONENT) {
		throw new Error(`XRP Ledger token amount out of range: ${value}`);
	}

	// value = digits × 10^(exponent − fraction length), so value × 10^decimals = digits × 10^shift.
	const digits = `${integer}${fraction}`;
	const shift = Number(exponent) - fraction.length + decimals;

	const scaled =
		shift >= 0
			? BigInt(digits) * 10n ** BigInt(shift)
			: digits.length + shift > 0
				? BigInt(digits.slice(0, digits.length + shift))
				: ZERO;

	return sign === '-' ? -scaled : scaled;
};
