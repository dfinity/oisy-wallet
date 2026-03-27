import IcTransactionsCkBtcListeners from '$icp/components/transactions/IcTransactionsCkBtcListeners.svelte';
import IcTransactionsCkEthereumListeners from '$icp/components/transactions/IcTransactionsCkEthereumListeners.svelte';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import type { TokenToListener } from '$lib/types/listener';
import type { OptionToken } from '$lib/types/token';
import { isNetworkICP } from '$lib/utils/network.utils';
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

		if (isNetworkICP(token.network)) {
			return isTokenCkBtcLedger(token)
				? [...acc, { token, listener: IcTransactionsCkBtcListeners }]
				: isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token)
					? [...acc, { token, listener: IcTransactionsCkEthereumListeners }]
					: acc;
		}

		return acc;
	}, []);
