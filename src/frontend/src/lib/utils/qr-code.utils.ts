import {
	DecodedUrnSchema,
	URN_NUMERIC_PARAMS,
	URN_STRING_PARAMS,
	type DecodedUrn,
	type QrResponse,
	type QrStatus
} from '$lib/types/qr-code';
import type { OptionToken } from '$lib/types/token';
import { decodePayment } from '@dfinity/ledger-icrc';
import { isNullish, nonNullish } from '@dfinity/utils';

/**
 * Decodes a URN string into a DecodedUrn object, breaking it down into its components.
 *
 * The URN string is expected to follow the pattern defined by the regex:
 * /^([a-zA-Z]+):([a-zA-Z0-9\-.]+)(@(\d+))?(\/([a-zA-Z]+))?(\?(.*))?$/
 *
 * This regex pattern is inspired by multiple sources with each respective URN scheme:
 * - For IC: https://github.com/dfinity/ICRC/issues/22
 * - For ETH: https://eips.ethereum.org/EIPS/eip-681
 * - For BTC: https://github.com/bitcoin/bips/blob/master/bip-0021.mediawiki
 *
 * @param {string} urn - The URN string to decode.
 * @returns {DecodedUrn | undefined} The decoded URN object, or undefined if the URN string does not match the expected pattern.
 */
export const decodeQrCodeUrn = (urn: string): DecodedUrn | undefined => {
	const regex = /^([a-zA-Z]+):([a-zA-Z0-9\-.]+)(@(\d+))?(\/([a-zA-Z]+))?(\?(.*))?$/;

	const match = urn.match(regex);
	if (isNullish(match)) {
		return undefined;
	}

	const [_, prefix, destination, , networkId, , functionName, , queryString] = match;

	const processParam = ([key, value]: [string, string]) => {
		if ((URN_NUMERIC_PARAMS as readonly string[]).includes(key)) {
			return { [key]: parseFloat(value) };
		}
		if ((URN_STRING_PARAMS as readonly string[]).includes(key)) {
			return { [key]: value };
		}
		if (!isNaN(parseFloat(value))) {
			return { [key]: parseFloat(value) };
		}
		return { [key]: value };
	};

	const parseQueryString = (
		qs: string
	): { [key: string]: string | number | undefined } | undefined => {
		try {
			return [...new URLSearchParams(qs).entries()].reduce(
				(acc, entry) => ({
					...acc,
					...processParam(entry)
				}),
				{}
			);
		} catch (error: unknown) {
			console.warn('Invalid query string:', error);
			return undefined;
		}
	};

	const params = nonNullish(queryString) ? parseQueryString(queryString) : {};
	// Conservatively, it returns nothing if the function is unable to decipher the query parameters
	if (isNullish(params)) {
		return undefined;
	}

	const decodedUrn = {
		prefix,
		destination,
		...(networkId && { networkId }),
		...(functionName && { functionName }),
		...params
	};

	const result = DecodedUrnSchema.safeParse(decodedUrn);
	if (!result.success) {
		console.warn('QR code cannot be correctly parsed:', result.error);
		return undefined;
	}
	return result.data;
};

export const decodeQrCode = ({
	status,
	code,
	expectedToken
}: {
	status: QrStatus;
	code?: string;
	expectedToken?: OptionToken;
}): QrResponse => {
	if (status !== 'success') {
		return { status };
	}

	if (isNullish(code)) {
		return { status: 'cancelled' };
	}

	const payment = decodePayment(code);

	if (isNullish(payment)) {
		return { status: 'success', destination: code };
	}

	const { token: symbol, identifier: destination, amount } = payment;

	if (nonNullish(expectedToken) && symbol.toLowerCase() !== expectedToken.symbol.toLowerCase()) {
		return { status: 'token_incompatible' };
	}

	return { status: 'success', destination, symbol, amount };
};
