import { ICP_NETWORK_ID } from '$env/networks.env';
import { USDC_TOKEN } from '$env/tokens-erc20/tokens.usdc.env';
import { BTC_MAINNET_TOKEN } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN, ICP_TOKEN } from '$env/tokens.env';
import type { Token } from '$lib/types/token';
import { isNullish, nonNullish } from '@dfinity/utils';

const PINNED_TOKENS_ORDER: (Token & { twinTokenSymbol?: string })[] = [
	ICP_TOKEN,
	{ ...BTC_MAINNET_TOKEN, twinTokenSymbol: 'ckBTC' },
	{ ...ETHEREUM_TOKEN, twinTokenSymbol: 'ckETH' },
	USDC_TOKEN
];

export const pinTokensAtTop = (tokens: Token[]): Token[] => {
	const pinnedTokens = PINNED_TOKENS_ORDER.map(
		({ id: pinnedId, network: { id: pinnedNetworkId }, twinTokenSymbol }) => {
			const token = tokens.find(
				({ id, network: { id: networkId } }) => id === pinnedId && networkId === pinnedNetworkId
			);

			if (isNullish(twinTokenSymbol)) {
				return nonNullish(token) ? [token] : [];
			}

			const twinToken = tokens.find(
				({ id: twinTokenId, network: { id: twinTokenNetworkId } }) =>
					twinTokenId === Symbol(twinTokenSymbol) && twinTokenNetworkId === ICP_NETWORK_ID
			);

			return [token, twinToken].filter(nonNullish);
		}
	).flat();

	const otherTokens = tokens.filter(
		(token) =>
			!pinnedTokens.some(
				({ id, network: { id: networkId } }) => id === token.id && networkId === token.network.id
			)
	);

	return [...pinnedTokens, ...otherTokens];
};
