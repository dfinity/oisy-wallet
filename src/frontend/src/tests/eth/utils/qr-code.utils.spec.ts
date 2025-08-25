import { SEPOLIA_TOKEN } from '$env/tokens.env';
import { enabledErc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { decodeQrCode } from '$eth/utils/qr-code.utils';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { get } from 'svelte/store';
import { expect, type MockedFunction } from 'vitest';

vi.mock('$lib/utils/qr-code.utils', () => ({
	decodeQrCodeUrn: vi.fn()
}));

describe('decodeQrCode', () => {
	const token = SEPOLIA_TOKEN;
	const destination = 'some-address';
	const amount = 1.23;
	const urn = 'some-urn';

	const otherProps = {
		expectedToken: token,
		ethereumTokens: get(enabledEthereumTokens),
		erc20Tokens: get(enabledErc20Tokens)
	};

	const mockDecodeQrCodeUrn = decodeQrCodeUrn as MockedFunction<typeof decodeQrCodeUrn>;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return { result } when result is not success', () => {
		const response = decodeQrCode({ status: 'cancelled', ...otherProps });
		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "cancelled" } when code is nullish', () => {
		const response = decodeQrCode({ status: 'success', code: undefined, ...otherProps });
		expect(response).toEqual({ status: 'cancelled' });
	});

	it('should return { status: "success", destination: code } when payment is nullish', () => {
		mockDecodeQrCodeUrn.mockReturnValue(undefined);

		const response = decodeQrCode({ status: 'success', code: urn, ...otherProps });
		expect(response).toEqual({ status: 'success', destination: urn });

		expect(mockDecodeQrCodeUrn).toHaveBeenCalledWith(urn);
	});

	it('should return { status: "token_incompatible" } when tokens do not match', () => {
		const payment = {
			prefix: `not-${token.symbol}`,
			destination: destination,
			amount: amount
		};
		mockDecodeQrCodeUrn.mockReturnValue(payment);

		const response = decodeQrCode({
			status: 'success',
			code: urn,
			...otherProps
		});
		expect(response).toEqual({ status: 'token_incompatible' });

		expect(mockDecodeQrCodeUrn).toHaveBeenCalledWith(urn);
	});

	it('should return { status: "success", destination, token, amount } when everything matches', () => {
		const payment = {
			prefix: 'ethereum',
			destination: destination,
			value: amount * 10 ** token.decimals,
			ethereumChainId: (token.network as EthereumNetwork).chainId.toString()
		};
		mockDecodeQrCodeUrn.mockReturnValue(payment);

		const response = decodeQrCode({
			status: 'success',
			code: urn,
			...otherProps
		});
		expect(response).toEqual({
			status: 'success',
			destination: destination,
			symbol: token.symbol,
			amount: amount
		});

		expect(mockDecodeQrCodeUrn).toHaveBeenCalledWith(urn);
	});
});
