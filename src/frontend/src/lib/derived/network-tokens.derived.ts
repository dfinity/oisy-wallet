import { ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS } from '$env/networks.icrc.env';
import { ETHEREUM_TOKEN_ID, ICP_TOKEN_ID } from '$env/tokens.env';
import {
	notPseudoNetworkChainFusion,
	pseudoNetworkChainFusion,
	selectedNetwork
} from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { CanisterIdText } from '$lib/types/canister';
import type { Token } from '$lib/types/token';
import { filterTokensForSelectedNetwork } from '$lib/utils/network.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * All tokens matching the selected network or chain fusion, regardless if they are enabled by the user or not.
 */
const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork, pseudoNetworkChainFusion],
	filterTokensForSelectedNetwork
);

const enabledNetworkTokens: Readable<Token[]> = derived([networkTokens], ([$networkTokens]) =>
	$networkTokens.filter((token) => ('enabled' in token ? token.enabled : true))
);

/**
 * For various networks (e.g., ICP, Ethereum), we display tokens that are enabled.
 * This includes:
 * - Default tokens that have not been disabled by users
 * - Custom tokens that have been added and enabled by users
 *
 * For the pseudo network Chain Fusion we display:
 * - ICP tokens
 * - Ethereum tokens
 * - A subset of cK tokens
 * - Tokens that have been enabled by the user
 *
 * To determine if a token is enabled in the Chain Fusion network, in addition to checking the "enabled" flag,
 * we also verify if the "version" field is set. The "version" field indicates that the token has been persisted
 * in the backend canister and per extension set by the user.
 */
export const filteredNetworkTokens: Readable<Token[]> = derived(
	[enabledNetworkTokens, networkTokens, notPseudoNetworkChainFusion],
	([$enabledNetworkTokens, $networkTokens, $notPseudoNetworkChainFusion]) =>
		$notPseudoNetworkChainFusion
			? $enabledNetworkTokens
			: $networkTokens.filter(
					(token) =>
						[ICP_TOKEN_ID, ETHEREUM_TOKEN_ID].includes(token.id) ||
						('ledgerCanisterId' in token &&
							ICRC_CHAIN_FUSION_DEFAULT_LEDGER_CANISTER_IDS.includes(
								(token as { ledgerCanisterId: CanisterIdText }).ledgerCanisterId
							)) ||
						('enabled' in token && token.enabled && 'version' in token && nonNullish(token.version))
				)
);
