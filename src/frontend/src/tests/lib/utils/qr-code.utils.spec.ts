import { decodeQrCode } from '$lib/utils/qr-code.utils';
import { decodePayment } from '@dfinity/ledger-icrc';
import type { MockedFunction } from 'vitest';
import { ICP_TOKEN } from '../../mocks/tokens.mock';

const token = ICP_TOKEN;
const address = 'some-address';
const amount = 1.23;
const code = 'some-qr-code';

vi.mock('@dfinity/ledger-icrc', () => ({
	decodePayment: vi.fn()
}));

describe('decodeQrCode', () => {
	const mockDecodePayment = decodePayment as MockedFunction<typeof decodePayment>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return { result } when result is not success', () => {
		const response = decodeQrCode({ result: 'cancelled' });
		expect(response).toEqual({ result: 'cancelled' });
	});

	it('should return { result: "cancelled" } when code is nullish', () => {
		const response = decodeQrCode({ result: 'success', code: undefined });
		expect(response).toEqual({ result: 'cancelled' });
	});

	it('should return { result: "success", identifier: code } when payment is nullish', () => {
		mockDecodePayment.mockReturnValue(undefined);

		const response = decodeQrCode({ result: 'success', code });
		expect(response).toEqual({ result: 'success', identifier: code });

		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});

	it('should return { result: "token_incompatible" } when tokens do not match', () => {
		const payment = {
			token: `not-${token.symbol}`,
			identifier: address,
			amount: amount
		};
		mockDecodePayment.mockReturnValue(payment);

		const response = decodeQrCode({ result: 'success', code: code, requiredToken: token });
		expect(response).toEqual({ result: 'token_incompatible' });
		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});

	it('should return { result: "success", identifier, token, amount } when everything matches', () => {
		const payment = {
			token: token.symbol,
			identifier: address,
			amount: amount
		};
		mockDecodePayment.mockReturnValue(payment);

		const requiredToken = token;
		const response = decodeQrCode({ result: 'success', code: code, requiredToken });
		expect(response).toEqual({
			result: 'success',
			identifier: address,
			token: token.symbol,
			amount: amount
		});
		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});
});
