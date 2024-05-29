import { ICP_TOKEN, SEPOLIA_TOKEN } from '$env/tokens.env';
import type { EthereumNetwork } from '$eth/types/network';
import { tokens } from '$lib/derived/tokens.derived';
import type { DecodedUrn } from '$lib/types/qr-code';
import { decodeQrCode, decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import { generateUrn } from '../../mocks/qr-generator.mock';

describe('decodeQrCodeUrn', () => {
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
			const urn = generateUrn(token, destination, { amount });
			assertNonNullish(urn);

			const result = decodeQrCodeUrn(urn);

			const standard = token.standard;
			const expectedPrefix =
				standard === 'erc20'
					? 'ethereum'
					: standard === 'icrc'
						? token.name.toLowerCase()
						: standard;
			const expectedResult: DecodedUrn = {
				prefix: expectedPrefix,
				destination: destination,
				amount: amount
			};
			if (standard === 'ethereum' || standard === 'erc20') {
				expectedResult.ethereumChainId = (token.network as EthereumNetwork).chainId.toString();
			}
			if (standard === 'erc20' && 'address' in token) {
				expectedResult.functionName = 'transfer';
				expectedResult.address = token.address as string;
			}

			expect(result).toEqual(expectedResult);
		});
	});
});

describe('decodeQrCode', () => {
	const tokenList = get(tokens);
	const destination = 'some-address';
	const amount = 1.23;

	it('should return { result } when result is not success', () => {
		const response = decodeQrCode({ status: 'cancelled' });
		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "cancelled" } when code is nullish', () => {
		const response = decodeQrCode({ status: 'success', code: undefined });
		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "success", destination: code } when payment is nullish', () => {
		const urn = 'some-urn-that-does-not-exist';
		const response = decodeQrCode({ status: 'success', code: urn });
		expect(response).toEqual({ status: 'success', destination: urn });
	});

	it('should return { status: "token_incompatible" } when tokens do not match', () => {
		const urn = generateUrn(ICP_TOKEN, destination, { amount });
		const response = decodeQrCode({ status: 'success', code: urn, expectedToken: SEPOLIA_TOKEN });
		expect(response).toEqual({ status: 'token_incompatible' });
	});

	tokenList.forEach((token) => {
		it(`should return the correct response for the token ${token.name} when everything matches`, () => {
			const urn = generateUrn(token, destination, { amount });
			const response = decodeQrCode({ status: 'success', code: urn, expectedToken: token });
			expect(response).toEqual({
				status: 'success',
				destination: destination,
				token: token.symbol,
				amount: amount
			});
		});
	});
});
