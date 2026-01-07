import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { tokens } from '$lib/derived/tokens.derived';
import type { DecodedUrn } from '$lib/types/qr-code';
import { assertIsNetworkEthereum } from '$lib/utils/network.utils';
import { decodeQrCode, decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { generateUrn } from '$tests/mocks/qr-generator.mock';
import { assertNonNullish } from '@dfinity/utils';
import { decodePayment } from '@icp-sdk/canisters/ledger/icrc';
import { get } from 'svelte/store';

vi.mock('@icp-sdk/canisters/ledger/icrc', () => ({
	decodePayment: vi.fn()
}));

describe('decodeUrn', () => {
	const tokenList = get(tokens);
	const destination = 'some-destination';
	const amount = 1.23;

	it('should return undefined for an invalid URN', () => {
		const urn = 'invalidURN';
		const result = decodeQrCodeUrn({ urn });

		expect(result).toBeUndefined();
	});

	tokenList.forEach((token) => {
		it(`should decode a basic URN for the token ${token.name}`, () => {
			const urn = generateUrn({ token, destination, params: { amount } });
			assertNonNullish(urn);

			const result = decodeQrCodeUrn({ urn });

			const {
				standard: { code: standard }
			} = token;

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
				assertIsNetworkEthereum(token.network);
				expectedResult.ethereumChainId = token.network.chainId.toString();
			}
			if (standard === 'erc20' && 'address' in token) {
				expectedResult.functionName = 'transfer';
				expectedResult.address = destination;
				expectedResult.destination = token.address as string;
			}

			expect(result).toEqual(expectedResult);
		});
	});

	describe('decodeQrCodeUrn', () => {
		const validAddress = '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC';

		describe('valid URIs', () => {
			it('should parse complete URI with all required fields', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=1000` });

				expect(result).toEqual({
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1',
					prefix: 'ethereum',
					value: 1000
				});
			});

			it('should parse URI with different chainId', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@137?value=1000` });

				expect(result?.ethereumChainId).toBe('137');
			});

			it('should parse URI with large value', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1000000000000000000`
				});

				expect(result?.value).toBe(1000000000000000000);
			});

			it('should parse URI with zero value', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=0` });

				expect(result?.value).toBe(0);
			});

			it('should parse URI with chainId zero', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@0?value=1000` });

				expect(result?.ethereumChainId).toBe('0');
			});

			it('should preserve address case', () => {
				const mixedCaseAddress = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
				const result = decodeQrCodeUrn({ urn: `ethereum:${mixedCaseAddress}@1?value=1000` });

				expect(result?.destination).toBe(mixedCaseAddress);
			});
		});

		describe('missing required fields', () => {
			it('should return undefined when chainId is missing', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}?value=1000` });

				expect(result).toEqual({
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					prefix: 'ethereum',
					value: 1000
				});
			});

			it('should return undefined when value is missing', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1` });

				expect(result).toEqual({
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					ethereumChainId: '1',
					prefix: 'ethereum'
				});
			});

			it('should return undefined when both chainId and value are missing', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}` });

				expect(result).toEqual({
					destination: '0x9C2242a0B71FD84661Fd4bC56b75c90Fac6d10FC',
					prefix: 'ethereum'
				});
			});

			it('should return undefined when address is missing', () => {
				const result = decodeQrCodeUrn({ urn: 'ethereum:@1?value=1000' });

				expect(result).toBeUndefined();
			});

			it('should return undefined when all fields are missing', () => {
				const result = decodeQrCodeUrn({ urn: 'ethereum:' });

				expect(result).toBeUndefined();
			});
		});

		describe('invalid chainId', () => {
			it('should return undefined for negative chainId', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@-1?value=1000` });

				expect(result).toBeUndefined();
			});

			it('should return undefined for non-numeric chainId', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@abc?value=1000` });

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty chainId', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@?value=1000` });

				expect(result).toBeUndefined();
			});

			it('should return undefined for chainId with whitespace', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@   ?value=1000` });

				expect(result).toBeUndefined();
			});
		});

		describe('invalid value', () => {
			it('should return undefined for non-numeric value', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=abc` });

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty value', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=` });

				expect(result).toBeUndefined();
			});

			it('should return undefined for value with whitespace', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=   ` });

				expect(result).toBeUndefined();
			});
		});

		describe('edge cases', () => {
			it('should handle URI with extra query parameters', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=1000&gas=21000` });

				expect(result?.destination).toBe(validAddress);
				expect(result?.ethereumChainId).toBe('1');
				expect(result?.value).toBe(1000);
			});

			it('should handle URI with value as first parameter', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1000&other=param`
				});

				expect(result?.value).toBe(1000);
			});

			it('should handle URI with very large chainId', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@999999999?value=1000` });

				expect(result?.ethereumChainId).toBe('999999999');
			});

			it('should handle URI with chainId having leading zeros', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@001?value=1000` });

				expect(result?.ethereumChainId).toBe('001');
			});

			it('should handle URI with value having leading zeros', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=00100` });

				expect(result?.value).toBe(100);
			});
		});

		describe('malformed URIs', () => {
			it('should not throw on unexpected input', () => {
				expect(() => decodeQrCodeUrn({ urn: 'ethereum:???@@@' })).not.toThrowError();
			});

			it('should not throw on special characters', () => {
				expect(() => decodeQrCodeUrn({ urn: 'ethereum:$%^&*()@1?value=1000' })).not.toThrowError();
			});
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
