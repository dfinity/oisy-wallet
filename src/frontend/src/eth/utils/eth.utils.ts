import {
	SUPPORTED_ETHEREUM_TOKEN_IDS,
	type SUPPORTED_ETHEREUM_TOKENS
} from '$env/tokens/tokens.eth.env';
import type { EthereumNetwork } from '$eth/types/network';
import { DEFAULT_ETHEREUM_NETWORK } from '$lib/constants/networks.constants';
import type { Network } from '$lib/types/network';
import type { OptionToken, TokenId } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

export const isDefaultEthereumToken = (token: OptionToken): boolean =>
	nonNullish(token) && token.category === 'default' && token.standard === 'ethereum';

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
	nonNullish((network as EthereumNetwork)?.explorerUrl)
		? (network as EthereumNetwork).explorerUrl
		: nonNullish((token?.network as EthereumNetwork)?.explorerUrl)
			? (token?.network as EthereumNetwork).explorerUrl
			: DEFAULT_ETHEREUM_NETWORK.explorerUrl;
