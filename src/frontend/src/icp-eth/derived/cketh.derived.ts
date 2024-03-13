import type { EthereumNetwork } from '$eth/types/network';
import { ETHEREUM_NETWORK, SEPOLIA_NETWORK } from '$icp-eth/constants/networks.constants';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$icp-eth/constants/tokens.constants';
import {
	LOCAL_CKETH_LEDGER_CANISTER_ID,
	STAGING_CKETH_LEDGER_CANISTER_ID
} from '$icp/constants/icrc.constants';
import type { IcToken } from '$icp/types/ic';
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

export const ckEthereumToken: Readable<Token> = derived([token], ([$token]) => {
	const { ledgerCanisterId } = $token as Partial<IcToken>;

	switch (ledgerCanisterId) {
		case LOCAL_CKETH_LEDGER_CANISTER_ID:
		case STAGING_CKETH_LEDGER_CANISTER_ID:
			return SEPOLIA_TOKEN;
		default:
			return ETHEREUM_TOKEN;
	}
});

export const ckEthereumTokenId: Readable<TokenId> = derived([ckEthereumToken], ([{ id }]) => id);

export const ckEthereumNetwork: Readable<EthereumNetwork> = derived([token], ([$token]) => {
	const { ledgerCanisterId } = $token as Partial<IcToken>;

	switch (ledgerCanisterId) {
		case LOCAL_CKETH_LEDGER_CANISTER_ID:
		case STAGING_CKETH_LEDGER_CANISTER_ID:
			return SEPOLIA_NETWORK;
		default:
			return ETHEREUM_NETWORK;
	}
});

export const ckEthereumNetworkId: Readable<NetworkId> = derived(
	[ckEthereumNetwork],
	([{ id }]) => id
);
