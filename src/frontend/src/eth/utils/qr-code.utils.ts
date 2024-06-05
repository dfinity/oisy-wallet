import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import { type QrResponse, type QrStatus } from '$lib/types/qr-code';
import type { Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { hexStringToUint8Array, isNullish, nonNullish } from '@dfinity/utils';
import { BigNumber } from '@ethersproject/bignumber';

export const decodeQrCode = ({
	status,
	code,
	expectedToken,
	ethereumTokens,
	erc20Tokens
}: {
	status: QrStatus;
	code?: string | undefined;
	expectedToken: Token;
	ethereumTokens: Token[];
	erc20Tokens: Erc20Token[];
}): QrResponse => {
	if (status !== 'success') {
		return { status };
	}

	if (isNullish(code)) {
		return { status: 'cancelled' };
	}

	const payment = decodeQrCodeUrn(code);

	if (isNullish(payment)) {
		return { status: 'success', destination: code };
	}

	const { prefix, destination, value, uint256, address, ethereumChainId, functionName } = payment;

	const normalizeChainId = (chainId: string): string => {
		if (chainId.startsWith('0x')) {
			return hexStringToUint8Array(chainId).toString();
		}
		return chainId;
	};

	const matchEthereumToken = ({
		address,
		functionName,
		ethereumChainId,
		fallbackEthereumChainId
	}: {
		address: string | undefined;
		functionName: string | undefined;
		ethereumChainId: string | undefined;
		fallbackEthereumChainId: string | bigint | number;
	}): Token | undefined => {
		const parsedEthereumChainId = nonNullish(ethereumChainId)
			? normalizeChainId(ethereumChainId)
			: fallbackEthereumChainId;

		if (nonNullish(address) && functionName === 'transfer') {
			return (
				erc20Tokens.find(
					(token) =>
						token.address.toLowerCase() === address.toLowerCase() &&
						(token.network as EthereumNetwork).chainId.toString() ===
							parsedEthereumChainId.toString()
				) ?? undefined
			);
		}

		return (
			ethereumTokens.find(
				(token) =>
					(token.network as EthereumNetwork).chainId.toString() === parsedEthereumChainId.toString()
			) ?? undefined
		);
	};

	const token =
		prefix === 'ethereum'
			? matchEthereumToken({
					address,
					functionName,
					ethereumChainId,
					fallbackEthereumChainId: (expectedToken.network as EthereumNetwork).chainId
				})
			: undefined;

	if (isNullish(token)) {
		return { status: 'token_incompatible' };
	}

	if (token.id !== expectedToken.id) {
		return { status: 'token_incompatible' };
	}

	const amount =
		functionName === 'transfer'
			? uint256
			: nonNullish(value)
				? +formatToken({ value: BigNumber.from(value.toString()), unitName: token.decimals })
				: undefined;

	return { status: 'success', destination, symbol: token.symbol, amount };
};
