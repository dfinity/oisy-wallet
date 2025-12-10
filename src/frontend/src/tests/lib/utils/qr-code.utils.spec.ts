import { ICP_TOKEN } from '$env/tokens/tokens.icp.env';
import type { EthereumNetwork } from '$eth/types/network';
import { isTokenIcrc } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import { tokens } from '$lib/derived/tokens.derived';
import type { DecodedUrn } from '$lib/types/qr-code';
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
	const amount = 123;

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
				amount: BigInt(amount)
			};

			if (standard === 'ethereum' || standard === 'erc20') {
				expectedResult.ethereumChainId = (token.network as EthereumNetwork).chainId.toString();
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

		describe('valid URIs - number mode (default)', () => {
			it('should parse complete URI with all required fields', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=1000` });

				expect(result).toEqual({
					destination: validAddress,
					ethereumChainId: '1',
					prefix: 'ethereum',
					value: 1000n
				});
			});

			it('should parse URI with different chainId', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@137?value=1000` });

				expect(result?.ethereumChainId).toBe('137');
				expect(typeof result?.value).toBe('number');
			});

			it('should parse URI with large value as number', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1000000000000000000`
				});

				expect(result?.value).toBe(1000000000000000000);
				expect(typeof result?.value).toBe('number');
			});

			it('should parse URI with zero value', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=0` });

				expect(result?.value).toBe(ZERO);
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

			it('should parse float values and round down', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=1.23` });

				expect(result?.value).toBe(1.23);
			});

			it('should parse scientific notation', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=1.23e18` });

				expect(result?.value).toBe(1230000000000000000);
			});
		});

		describe('valid URIs - bigint mode (isDFX: true)', () => {
			it('should parse complete URI with bigint values', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1000`,
					isDFX: true
				});

				expect(result).toEqual({
					destination: validAddress,
					ethereumChainId: '1',
					prefix: 'ethereum',
					value: 1000n
				});
				expect(typeof result?.value).toBe('bigint');
			});

			it('should parse large values as bigint without precision loss', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=10155880570000000000`,
					isDFX: true
				});

				expect(result?.value).toBe(10155880570000000000n);
				expect(typeof result?.value).toBe('bigint');
			});

			it('should parse ERC20 transfer with uint256 as bigint', () => {
				const tokenContract = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
				const result = decodeQrCodeUrn({
					urn: `ethereum:${tokenContract}@8453/transfer?address=${validAddress}&uint256=1000000`,
					isDFX: true
				});

				expect(result?.uint256).toBe(1000000n);
				expect(typeof result?.uint256).toBe('bigint');
			});

			it('should parse float values and round down to bigint', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1.23`,
					isDFX: true
				});

				expect(result?.value).toBeUndefined();
			});

			it('should parse scientific notation as bigint', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1.23e18`,
					isDFX: true
				});

				expect(result?.value).toBeUndefined();
			});

			it('should handle zero as bigint', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=0`,
					isDFX: true
				});

				expect(result?.value).toBe(ZERO);
			});

			it('should handle maximum uint256 value', () => {
				const maxUint256 =
					'115792089237316195423570985008687907853269984665640564039457584007913129639935';
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=${maxUint256}`,
					isDFX: true
				});

				expect(result?.value).toBe(BigInt(maxUint256));
			});
		});

		describe('missing optional fields', () => {
			it('should parse when chainId is missing', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}?value=1000` });

				expect(result).toEqual({
					destination: validAddress,
					prefix: 'ethereum',
					value: 1000n
				});
			});

			it('should parse when value is missing', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1` });

				expect(result).toEqual({
					destination: validAddress,
					ethereumChainId: '1',
					prefix: 'ethereum'
				});
			});

			it('should parse when both chainId and value are missing', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}` });

				expect(result).toEqual({
					destination: validAddress,
					prefix: 'ethereum'
				});
			});
		});

		describe('invalid URIs', () => {
			it('should return undefined when address is missing', () => {
				const result = decodeQrCodeUrn({ urn: 'ethereum:@1?value=1000' });

				expect(result).toBeUndefined();
			});

			it('should return undefined when all fields are missing', () => {
				const result = decodeQrCodeUrn({ urn: 'ethereum:' });

				expect(result).toBeUndefined();
			});

			it('should return undefined for invalid URI format', () => {
				const result = decodeQrCodeUrn({ urn: 'not-a-valid-uri' });

				expect(result).toBeUndefined();
			});

			it('should return undefined for empty string', () => {
				const result = decodeQrCodeUrn({ urn: '' });

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

			it('should return undefined for non-numeric value in bigint mode', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=abc`,
					isDFX: true
				});

				expect(result).toBeUndefined();
			});
		});

		describe('edge cases', () => {
			it('should handle URI with extra query parameters', () => {
				const result = decodeQrCodeUrn({ urn: `ethereum:${validAddress}@1?value=1000&gas=21000` });

				expect(result?.destination).toBe(validAddress);
				expect(result?.ethereumChainId).toBe('1');
				expect(result?.value).toBe(1000);
				expect(result?.gas).toBe(21000);
			});

			it('should handle URI with value as first parameter', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=1000&other=param`
				});

				expect(result?.value).toBe(1000n);
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

				expect(result?.value).toBe(100n);
			});

			it('should handle URI with value having leading zeros in bigint mode', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${validAddress}@1?value=00100`,
					isDFX: true
				});

				expect(result?.value).toBe(100n);
			});
		});

		describe('malformed URIs', () => {
			it('should not throw on unexpected input', () => {
				expect(() => decodeQrCodeUrn({ urn: 'ethereum:???@@@' })).not.toThrow();
			});

			it('should not throw on special characters', () => {
				expect(() => decodeQrCodeUrn({ urn: 'ethereum:$%^&*()@1?value=1000' })).not.toThrow();
			});

			it('should not throw on unexpected input in bigint mode', () => {
				expect(() => decodeQrCodeUrn({ urn: 'ethereum:???@@@', isDFX: true })).not.toThrow();
			});
		});

		describe('ERC20 transfers', () => {
			const tokenContract = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

			it('should parse ERC20 transfer in number mode', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${tokenContract}@8453/transfer?address=${validAddress}&uint256=1000000`
				});

				expect(result).toEqual({
					destination: tokenContract,
					ethereumChainId: '8453',
					prefix: 'ethereum',
					functionName: 'transfer',
					address: validAddress,
					uint256: 1000000
				});
				expect(typeof result?.uint256).toBe('number');
			});

			it('should parse ERC20 transfer in bigint mode', () => {
				const result = decodeQrCodeUrn({
					urn: `ethereum:${tokenContract}@8453/transfer?address=${validAddress}&uint256=1000000`,
					isDFX: true
				});

				expect(result?.uint256).toBe(1000000n);
				expect(typeof result?.uint256).toBe('bigint');
			});

			it('should parse ERC20 transfer with large amount in bigint mode', () => {
				const largeAmount = '999999999999999999999';
				const result = decodeQrCodeUrn({
					urn: `ethereum:${tokenContract}@8453/transfer?address=${validAddress}&uint256=${largeAmount}`,
					isDFX: true
				});

				expect(result?.uint256).toBe(BigInt(largeAmount));
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
