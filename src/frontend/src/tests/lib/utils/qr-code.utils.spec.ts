import type { EthereumNetwork } from '$eth/types/network';
import { tokens } from '$lib/derived/tokens.derived';
import type { DecodedUrn } from '$lib/types/qr-code';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';
import { generateUrn } from '../../mocks/qr-generator.mock';

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
