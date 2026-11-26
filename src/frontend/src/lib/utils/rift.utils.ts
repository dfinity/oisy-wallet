import { isBitcoinToken } from '$btc/utils/token.utils';
import { RIFT_BTC_ASSET_ID, RIFT_EVM_NATIVE_ASSETS } from '$env/rest/rift.env';
import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isDefaultEthereumToken } from '$eth/utils/eth.utils';
import type { Token } from '$lib/types/token';
import { isNetworkEthereum, isNetworkIdBTCMainnet } from '$lib/utils/network.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Rift's canonical asset id for a token, as a `format: "raw"` quote writes it, or `undefined` for a
 * token Rift is never asked about:
 *
 * - native BTC on mainnet → `bitcoin.btc`;
 * - the native coin of an EVM network in `RIFT_EVM_NATIVE_ASSETS` → `evm:<chainId>.<name>`;
 * - an ERC-20 on such a network → `evm:<chainId>.<contract address>`, lowercased as Rift writes it.
 */
export const toRiftAssetId = (token: Token): string | undefined => {
	const { network } = token;

	if (isNetworkIdBTCMainnet(network.id)) {
		return isBitcoinToken(token) ? RIFT_BTC_ASSET_ID : undefined;
	}

	if (!isNetworkEthereum(network)) {
		return;
	}

	const nativeAsset = RIFT_EVM_NATIVE_ASSETS[network.id];

	if (isNullish(nativeAsset)) {
		return;
	}

	const chain = `evm:${network.chainId}`;

	if (isTokenErc20(token)) {
		return `${chain}.${token.address.toLowerCase()}`;
	}

	return isDefaultEthereumToken(token) ? `${chain}.${nativeAsset}` : undefined;
};

// Rift's ids are lowercase, but an EVM address is hex, so an echo is compared without case.
export const isSameRiftAssetId = ({ a, b }: { a: string; b: string }): boolean =>
	a.toLowerCase() === b.toLowerCase();
