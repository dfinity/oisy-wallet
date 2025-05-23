import BitcoinListener from '$btc/components/core/BitcoinListener.svelte';
import EthListener from '$eth/components/core/EthListener.svelte';
import IcTransactionsCkBTCListeners from '$icp/components/transactions/IcTransactionsCkBTCListeners.svelte';
import IcTransactionsCkEthereumListeners from '$icp/components/transactions/IcTransactionsCkEthereumListeners.svelte';
import {
	isTokenCkBtcLedger,
	isTokenCkErc20Ledger,
	isTokenCkEthLedger
} from '$icp/utils/ic-send.utils';
import type { TokenToListener } from '$lib/types/listener';
import type { OptionToken } from '$lib/types/token';
import {
	isNetworkICP,
	isNetworkIdBitcoin,
	isNetworkIdEthereum,
	isNetworkIdEvm
} from '$lib/utils/network.utils';
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

		if (isNetworkICP(token.network)) {
			return isTokenCkBtcLedger(token)
				? [...acc, { token, listener: IcTransactionsCkBTCListeners }]
				: isTokenCkEthLedger(token) || isTokenCkErc20Ledger(token)
					? [...acc, { token, listener: IcTransactionsCkEthereumListeners }]
					: acc;
		}

		return acc;
	}, []);
