import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
import EthListener from '$eth/components/core/EthListener.svelte';
import type { TokenToListener } from '$lib/types/listener';
import type { OptionToken } from '$lib/types/token';
import { isNetworkIdBitcoin, isNetworkIdEthereum, isNetworkIdEvm } from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';

/** Mapping function to set listeners for a list of tokens
 *
 * @param {OptionToken[]} tokens An array of tokens to be mapped
 * @returns {TokenToListener[]} An array of token-listener pairs
 */
export const mapListeners = (tokens: OptionToken[]): TokenToListener[] =>
	tokens.reduce<TokenToListener[]>((acc, token) => {
		if (isNullish(token)) {
			return acc;
		}

		if (isNetworkIdBitcoin(token.network.id)) {
			return [...acc, { token, listener: BitcoinListener }];
		}

		if (isNetworkIdEthereum(token.network.id) || isNetworkIdEvm(token.network.id)) {
			return [...acc, { token, listener: EthListener }];
		}

		return acc;
	}, []);
