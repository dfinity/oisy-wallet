import { erc20Tokens } from '$eth/derived/erc20.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { type QrResponse, type QrStatus } from '$lib/types/qr-code';
import { decodeQrCodeUrn } from '$lib/utils/qr-code.utils';
import { isNullish, nonNullish, type Token } from '@dfinity/utils';
import { get } from 'svelte/store';

export const decodeQrCode = ({
	status,
	code,
	expectedToken
}: {
	status: QrStatus;
	code?: string | undefined;
	expectedToken?: Token;
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

	const { prefix, destination, amount, address, ethereumChainId, functionName } = payment;

	const normalizeChainId = (chainId: string): string => {
		if (chainId.startsWith('0x')) {
			return parseInt(chainId, 16).toString();
		}
		return chainId;
	};

	const matchEthereumToken = (
		address: string | undefined,
		functionName: string | undefined,
		ethereumChainId: string | undefined
	): string | undefined => {
		const parsedEthereumChainId = nonNullish(ethereumChainId)
			? normalizeChainId(ethereumChainId)
			: 1n;
		console.warn('parsedEthereumChainId', parsedEthereumChainId);

		if (nonNullish(address) && functionName === 'transfer') {
			const erc20TokensList = get(erc20Tokens);
			return (
				erc20TokensList.find(
					(token) =>
						token.address.toLowerCase() === address.toLowerCase() &&
						(token.network as EthereumNetwork).chainId.toString() ===
							parsedEthereumChainId.toString()
				)?.symbol || undefined
			);
		}

		const enabledEthereumTokensList = get(enabledEthereumTokens);
		return (
			enabledEthereumTokensList.find(
				(token) =>
					(token.network as EthereumNetwork).chainId.toString() === parsedEthereumChainId.toString()
			)?.symbol || undefined
		);
	};

	const token =
		prefix === 'ethereum' ? matchEthereumToken(address, functionName, ethereumChainId) : undefined;

	if (isNullish(token)) {
		return { status: 'token_incompatible' };
	}

	if (nonNullish(expectedToken) && token.toLowerCase() !== expectedToken.symbol.toLowerCase()) {
		return { status: 'token_incompatible' };
	}

	return { status: 'success', destination, token, amount };
};
