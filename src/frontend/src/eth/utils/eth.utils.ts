import {
	SUPPORTED_ETHEREUM_TOKEN_IDS,
	type SUPPORTED_ETHEREUM_TOKENS
} from '$env/tokens/tokens.eth.env';
import { isTokenEthereumNative } from '$eth/utils/native-token.utils';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import type { Network } from '$lib/types/network';
import type { OptionToken, TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import type { EthersError } from 'ethers/utils';

export const isDefaultEthereumToken = (token: OptionToken): boolean =>
	nonNullish(token) && token.category === 'default' && isTokenEthereumNative(token);

export const isNotDefaultEthereumToken = (token: OptionToken): boolean =>
	!isDefaultEthereumToken(token);

export const isSupportedEthTokenId = (tokenId: TokenId): boolean =>
	SUPPORTED_ETHEREUM_TOKEN_IDS.includes(tokenId);

export const isSupportedEthToken = (
	token: OptionToken
): token is (typeof SUPPORTED_ETHEREUM_TOKENS)[0] =>
	nonNullish(token) && isSupportedEthTokenId(token.id);

export const isNotSupportedEthTokenId = (tokenId: TokenId): boolean =>
	!isSupportedEthTokenId(tokenId);

export const getExplorerUrl = ({
	token,
	network
}: {
	token?: OptionToken;
	network?: Network;
}): string =>
	nonNullish(network)
		? network.explorerUrl
		: nonNullish(token?.network)
			? token.network.explorerUrl
			: DEFAULT_ETHEREUM_NETWORK.explorerUrl;

// An error ethers raised: `code` is one of a fixed set, while the message carries whatever ethers
// knows about the failure, such as the request it sent and the node's answer.
export const isEthersError = (err: unknown): err is EthersError =>
	err instanceof Error && 'shortMessage' in err && typeof err.shortMessage === 'string';

// How many `cause` links to follow: a send wraps an ethers error once, and a caller may wrap that.
const MAX_CAUSE_DEPTH = 5;

/**
 * The ethers error behind `err`: `err` itself, or the one a send wrapped as the cause to say what
 * became of its transaction (`EthNonceReadError`, `EthSubmissionUnconfirmedError`).
 */
export const findEthersError = (err: unknown): EthersError | undefined => {
	let current: unknown = err;

	for (let depth = 0; depth <= MAX_CAUSE_DEPTH && current instanceof Error; depth++) {
		if (isEthersError(current)) {
			return current;
		}

		current = current.cause;
	}
};
