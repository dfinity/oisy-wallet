import { ICP_TOKEN } from '$env/tokens.env';
import { icDecodeQrCode } from '$icp/utils/qr-code.utils';
import { decodePayment } from '@dfinity/ledger-icrc';
import type { MockedFunction } from 'vitest';

const token = ICP_TOKEN;
const address = 'some-address';
const amount = 1.23;
const code = 'some-qr-code';

vi.mock('@dfinity/ledger-icrc', () => ({
	decodePayment: vi.fn()
}));

describe('icDecodeQrCode', () => {
	const mockDecodePayment = decodePayment as MockedFunction<typeof decodePayment>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return { result } when result is not success', () => {
		const response = icDecodeQrCode({ status: 'cancelled' });
		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "cancelled" } when code is nullish', () => {
		const response = icDecodeQrCode({ status: 'success', code: undefined });
		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "success", identifier: code } when payment is nullish', () => {
		mockDecodePayment.mockReturnValue(undefined);

		const response = icDecodeQrCode({ status: 'success', code });
		expect(response).toEqual({ status: 'success', destination: code });

		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});

	it('should return { status: "token_incompatible" } when tokens do not match', () => {
		const payment = {
			token: `not-${token.symbol}`,
			identifier: address,
			amount: amount
		};
		mockDecodePayment.mockReturnValue(payment);

		const response = icDecodeQrCode({ status: 'success', code: code, expectedToken: token });
		expect(response).toEqual({ status: 'token_incompatible' });
		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});

	it('should return { status: "success", identifier, token, amount } when everything matches', () => {
		const payment = {
			token: token.symbol,
			identifier: address,
			amount: amount
		};
		mockDecodePayment.mockReturnValue(payment);

		const response = icDecodeQrCode({ status: 'success', code: code, expectedToken: token });
		expect(response).toEqual({
			status: 'success',
			destination: address,
			tokenSymbol: token.symbol,
			amount: amount
		});
		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});
});
