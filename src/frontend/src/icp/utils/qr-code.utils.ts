import type { QrResponse, QrStatus } from '$lib/types/qr-code';
import { decodePayment } from '@dfinity/ledger-icrc';
import { isNullish, nonNullish, type Token } from '@dfinity/utils';

export const icDecodeQrCode = ({
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

	const { token: tokenSymbol, identifier: destination, amount } = payment;

	if (
		nonNullish(expectedToken) &&
		tokenSymbol.toLowerCase() !== expectedToken.symbol.toLowerCase()
	) {
		return { status: 'token_incompatible' };
	}

	return { status: 'success', destination, tokenSymbol, amount };
};
