import type { QrResponse, QrStatus } from '$lib/types/qr-code';
import type { OptionToken } from '$lib/types/token';
import { decodePayment } from '@dfinity/ledger-icrc';
import { isNullish, nonNullish } from '@dfinity/utils';

export const icDecodeQrCode = ({
	status,
	code,
	expectedToken
}: {
	status: QrStatus;
	code?: string | undefined;
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
