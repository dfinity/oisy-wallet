import type { QrResponse, QrResult } from '$lib/types/qr-code';
import { decodePayment } from '@dfinity/ledger-icrc';
import { isNullish, nonNullish, type Token } from '@dfinity/utils';

export const decodeQrCode = ({
	result,
	code,
	requiredToken
}: {
	result: QrResult;
	code?: string | undefined;
	requiredToken?: Token | undefined;
}): QrResponse => {
	if (result !== 'success') {
		return { result };
	}

	if (isNullish(code)) {
		return { result: 'cancelled' };
	}

	const payment = decodePayment(code);

	if (isNullish(payment)) {
		return { result: 'success', identifier: code };
	}

	const { token, identifier, amount } = payment;

	if (nonNullish(requiredToken) && token.toLowerCase() !== requiredToken.symbol.toLowerCase()) {
		return { result: 'token_incompatible' };
	}

	return { result: 'success', identifier, token, amount };
};
