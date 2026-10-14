import { SEPOLIA_NETWORK } from '$env/networks/networks.eth.env';
import { SOLANA_DEVNET_NETWORK } from '$env/networks/networks.sol.env';
import {
	OISY_EXTENSION_INTERNAL_ERROR_CODE,
	OISY_EXTENSION_USER_REJECTED_CODE,
	OISY_EXTENSION_WALLET_CONNECT_TOPIC
} from '$lib/constants/extension.constants';
import type { ExtensionError, ExtensionSignRequest } from '$lib/types/extension';
import {
	SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION,
	SESSION_REQUEST_SOL_SIGN_MESSAGE,
	SESSION_REQUEST_SOL_SIGN_TRANSACTION
} from '$sol/constants/wallet-connect.constants';
import { isNullish } from '@dfinity/utils';
import type { WalletKitTypes } from '@reown/walletkit';
import type { ErrorResponse } from '@walletconnect/jsonrpc-utils';
import { getSdkError } from '@walletconnect/utils';

// The extension names Solana methods after the Wallet Standard features; the review screens expect
// WalletConnect's names.
const SOL_METHODS: Record<string, string> = {
	sol_signMessage: SESSION_REQUEST_SOL_SIGN_MESSAGE,
	sol_signTransaction: SESSION_REQUEST_SOL_SIGN_TRANSACTION,
	sol_signAndSendTransaction: SESSION_REQUEST_SOL_SIGN_AND_SEND_TRANSACTION
};

/**
 * Shape an extension sign request like a WalletConnect session request, so the existing review
 * screens can show and sign it unchanged. Returns `undefined` for a method they cannot handle.
 */
export const toWalletConnectSessionRequest = ({
	request: { chain, method, params, origin, address },
	id
}: {
	request: ExtensionSignRequest;
	id: number;
}): WalletKitTypes.SessionRequest | undefined => {
	// Nothing verifies the site's domain for extension requests, so the review must not present the
	// origin as verified. The origin itself comes from the browser, through the extension.
	const verifyContext: WalletKitTypes.SessionRequest['verifyContext'] = {
		verified: { origin, validation: 'UNKNOWN', verifyUrl: '' }
	};

	if (chain === 'eth') {
		return {
			id,
			topic: OISY_EXTENSION_WALLET_CONNECT_TOPIC,
			params: {
				chainId: `eip155:${SEPOLIA_NETWORK.chainId}`,
				request: { method, params }
			},
			verifyContext
		};
	}

	const solMethod = SOL_METHODS[method];

	if (isNullish(solMethod)) {
		return;
	}

	const { message, transaction } = (params ?? {}) as { message?: string; transaction?: string };

	return {
		id,
		topic: OISY_EXTENSION_WALLET_CONNECT_TOPIC,
		params: {
			chainId: `solana:${SOLANA_DEVNET_NETWORK.chainId}`,
			request: {
				method: solMethod,
				params:
					solMethod === SESSION_REQUEST_SOL_SIGN_MESSAGE
						? { message, pubkey: address }
						: { transaction }
			}
		},
		verifyContext
	};
};

/**
 * Translate a WalletConnect error into the EIP-1193 code a dapp expects: 4001 when the user
 * rejected, an internal error otherwise.
 */
export const toExtensionError = ({ code, message }: ErrorResponse): ExtensionError => ({
	code:
		code === getSdkError('USER_REJECTED').code
			? OISY_EXTENSION_USER_REJECTED_CODE
			: OISY_EXTENSION_INTERNAL_ERROR_CODE,
	message
});
