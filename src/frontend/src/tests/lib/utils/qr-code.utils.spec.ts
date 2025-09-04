import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { tokens } from '$lib/derived/tokens.derived';
import type { DecodedUrn } from '$lib/types/qr-code';
import { decodeQrCode, decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { generateUrn } from '$tests/mocks/qr-generator.mock';
import { decodePayment } from '@dfinity/ledger-icrc';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

vi.mock('@dfinity/ledger-icrc', () => ({
	decodePayment: vi.fn()
}));

describe('decodeUrn', () => {
	const tokenList = get(tokens);
	const destination = 'some-destination';
	const amount = 1.23;

	it('should return undefined for an invalid URN', () => {
		const urn = 'invalidURN';
		const result = decodeQrCodeUrn(urn);

		expect(result).toBeUndefined();
	});

	tokenList.forEach((token) => {
		it(`should decode a basic URN for the token ${token.name}`, () => {
			const urn = generateUrn({ token, destination, params: { amount } });
			assertNonNullish(urn);

			const result = decodeQrCodeUrn(urn);

			const { standard } = token;
			const expectedPrefix =
				standard === 'erc20'
					? 'ethereum'
					: isTokenIcrc(token)
						? token.name.toLowerCase()
						: standard;
			const expectedResult: DecodedUrn = {
				prefix: expectedPrefix,
				destination,
				amount
			};
			if (standard === 'ethereum' || standard === 'erc20') {
				expectedResult.networkId = (token.network as EthereumNetwork).chainId.toString();
			}
			if (standard === 'erc20' && 'address' in token) {
				expectedResult.functionName = 'transfer';
				expectedResult.address = destination;
				expectedResult.destination = token.address as string;
			}

			expect(result).toEqual(expectedResult);
		});
	});
});

describe('decodeQrCode', () => {
	const token = ICP_TOKEN;
	const address = 'some-address';
	const amount = 1.23;
	const code = 'some-qr-code';
	const mockDecodePayment = vi.mocked(decodePayment);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return { result } when result is not success', () => {
		const response = decodeQrCode({ status: 'cancelled' });

		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "cancelled" } when code is nullish', () => {
		const response = decodeQrCode({ status: 'success', code: undefined });

		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "success", identifier: code } when payment is nullish', () => {
		mockDecodePayment.mockReturnValue(undefined);

		const response = decodeQrCode({ status: 'success', code });

		expect(response).toEqual({ status: 'success', destination: code });

		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});

	it('should return { status: "token_incompatible" } when tokens do not match', () => {
		const payment = {
			token: `not-${token.symbol}`,
			identifier: address,
			amount
		};
		mockDecodePayment.mockReturnValue(payment);

		const response = decodeQrCode({ status: 'success', code, expectedToken: token });

		expect(response).toEqual({ status: 'token_incompatible' });
		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});

	it('should return { status: "success", identifier, token, amount } when everything matches', () => {
		const payment = {
			token: token.symbol,
			identifier: address,
			amount
		};
		mockDecodePayment.mockReturnValue(payment);

		const response = decodeQrCode({ status: 'success', code, expectedToken: token });

		expect(response).toEqual({
			status: 'success',
			destination: address,
			symbol: token.symbol,
			amount
		});
		expect(mockDecodePayment).toHaveBeenCalledWith(code);
	});
});
