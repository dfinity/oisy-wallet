import type { Erc20Token } from '$eth/types/erc20';
import type { EthereumNetwork } from '$eth/types/network';
import type { QrResponse, QrStatus } from '$lib/types/qr-code';
import type { OptionToken, Token } from '$lib/types/token';
import { formatToken } from '$lib/utils/format.utils';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { hexStringToUint8Array, isNullish, nonNullish } from '@dfinity/utils';

export const decodeQrCode = ({
	status,
	code,
	expectedToken,
	ethereumTokens,
	erc20Tokens
}: {
	status: QrStatus;
	code?: string;
	expectedToken: OptionToken;
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

	// According to ETH standard EIP-681, the prop defined as 'destinationOrTokenAddress' can be:
	// - 'destination' when the QR code refers to the native token ETH (mainnet or testnet),
	// 		so it refers to the destination wallet.
	// - 'tokenAddress' when the QR code refers to an ERC20 token, so it refers to the address of
	// 		the ERC20 token.
	// To differentiate the two cases, there is the 'functionName' parameter equal to 'transfer' in
	// the QR code.
	// Source https://eips.ethereum.org/EIPS/eip-681
	const {
		prefix,
		destination: destinationOrTokenAddress,
		value,
		uint256,
		address,
		ethereumChainId,
		functionName
	} = payment;

	const destination = functionName === 'transfer' ? address : destinationOrTokenAddress;

	if (isNullish(destination)) {
		return { status: 'success', destination };
	}

	const normalizeChainId = (chainId: string): string => {
		if (chainId.startsWith('0x')) {
			return hexStringToUint8Array(chainId).toString();
		}
		return chainId;
	};

	const matchEthereumToken = ({
		tokenAddress,
		ethereumChainId,
		fallbackEthereumChainId
	}: {
		tokenAddress: string | undefined;
		ethereumChainId: string | undefined;
		fallbackEthereumChainId: string | bigint | number;
	}): Token | undefined => {
		const parsedEthereumChainId = nonNullish(ethereumChainId)
			? normalizeChainId(ethereumChainId)
			: fallbackEthereumChainId;

		if (nonNullish(tokenAddress)) {
			return (
				erc20Tokens.find(
					(token) =>
						token.address.toLowerCase() === tokenAddress.toLowerCase() &&
						token.network.chainId.toString() === parsedEthereumChainId.toString()
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

	if (isNullish(expectedToken)) {
		return { status: 'token_incompatible' };
	}

	const token =
		prefix === 'ethereum'
			? matchEthereumToken({
					// If 'functionName' is 'transfer', 'destinationOrTokenAddress' refers to an ERC20 token
					// and is set as 'tokenAddress'. Otherwise, it should be 'undefined', to avoid passing
					// the address of the destination wallet as the address of the token.
					tokenAddress: functionName === 'transfer' ? destinationOrTokenAddress : undefined,
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
				? +formatToken({ value: BigInt(value), unitName: token.decimals })
				: undefined;

	return { status: 'success', destination, symbol: token.symbol, amount };
};
