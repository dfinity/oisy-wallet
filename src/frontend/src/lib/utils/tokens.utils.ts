import { ICP_NETWORK } from '$env/networks.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { Token } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';

const PINNED_TOKENS_ORDER = [
	ICP_TOKEN,
	BTC_MAINNET_TOKEN,
	ETHEREUM_TOKEN,
	{ id: Symbol('ckBTC'), network: ICP_NETWORK },
	{ id: Symbol('ckETH'), network: ICP_NETWORK },
	{ id: Symbol('ckUSDC'), network: ICP_NETWORK }
];

export const pinTokensAtTop = (tokens: Token[]): Token[] => {
	const pinnedTokens = PINNED_TOKENS_ORDER.map(
		({ id: pinnedId, network: { id: pinnedNetworkId } }) =>
			tokens.find(
				({ id, network: { id: networkId } }) => id === pinnedId && networkId === pinnedNetworkId
			)
	).filter(nonNullish);

	const otherTokens = tokens.filter(
		(token) =>
			!pinnedTokens.some(
				({ id, network: { id: networkId } }) => id === token.id && networkId === token.network.id
			)
	);

	return [...pinnedTokens, ...otherTokens];
};
