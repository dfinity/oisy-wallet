import { ETHEREUM_NETWORK } from '$env/networks.env';
import { ETHEREUM_TOKEN } from '$env/tokens.env';
import type { EthereumNetwork } from '$eth/types/network';
import type { IcCkToken, IcToken } from '$icp/types/ic';
import { isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { token, tokenStandard } from '$lib/derived/token.derived';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

/**
 * ETH to ckETH is supported:
 * - on network Ethereum if the token is Ethereum (and not some ERC20 token)
 * - on network ICP if the token is ckETH
 */
export const ethToCkETHEnabled: Readable<boolean> = derived(
	[tokenStandard, token],
	([$tokenStandard, $token]) =>
		$tokenStandard === 'ethereum' || isTokenCkEthLedger($token as IcToken)
);

/**
 * On ckETH, we need to know if the target for conversion is Ethereum mainnet or Sepolia.
 */
export const ckETHTwinToken: Readable<Token> = derived(
	[token],
	([$token]) => ($token as IcCkToken)?.twinToken ?? ETHEREUM_TOKEN
);

export const ckETHTwinTokenId: Readable<TokenId> = derived([ckETHTwinToken], ([{ id }]) => id);

export const ckETHTwinTokenNetwork: Readable<EthereumNetwork> = derived(
	[ckETHTwinToken],
	([{ network }]) => (network as EthereumNetwork | undefined) ?? ETHEREUM_NETWORK
);

export const ckETHTwinTokenNetworkId: Readable<NetworkId> = derived(
	[ckETHTwinTokenNetwork],
	([{ id }]) => id
);
