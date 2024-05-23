import {
	urnNumericParams,
	urnStringParams,
	type DecodedUrn,
	type QrResponse,
	type QrStatus
} from '$lib/types/qr-code';
import { decodePayment } from '@dfinity/ledger-icrc';
import { isNullish, nonNullish, type Token } from '@dfinity/utils';

export const decodeUrn = (urn: string): DecodedUrn | undefined => {
	const regex = /^([a-zA-Z]+):([a-zA-Z0-9\-.]+)(@(\d+))?(\/([a-zA-Z]+))?(\?(.*))?$/;

	const match = urn.match(regex);
	if (isNullish(match)) {
		return undefined;
	}

	const [_, prefix, destination, , networkId, , functionName, , queryString] = match;

	const params: { [key: string]: string | number | undefined } = {};

	if (queryString) {
		const queryParams = new URLSearchParams(queryString);
		queryParams.forEach((value, key) => {
			if ((urnNumericParams as readonly string[]).includes(key)) {
				params[key] = parseFloat(value);
			} else if ((urnStringParams as readonly string[]).includes(key)) {
				params[key] = value;
			} else if (!isNaN(parseFloat(value))) {
				params[key] = parseFloat(value);
			} else {
				params[key] = value;
			}
		});
	}

	return {
		prefix,
		destination,
		...(networkId && { networkId }),
		...(functionName && { functionName }),
		...params
	};
};

export const decodeQrCode = ({
	status,
	code,
	expectedToken
}: {
	status: QrStatus;
	code?: string | undefined;
	expectedToken?: Token;
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

	const { token, identifier: destination, amount } = payment;

	if (nonNullish(expectedToken) && token.toLowerCase() !== expectedToken.symbol.toLowerCase()) {
		return { status: 'token_incompatible' };
	}

	return { status: 'success', destination, token, amount };
};
