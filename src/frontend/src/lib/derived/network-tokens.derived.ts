import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { pseudoNetworkChainFusion, selectedNetwork } from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork, pseudoNetworkChainFusion],
	([$tokens, $selectedNetwork, $pseudoNetworkChainFusion]) =>
		$tokens.filter((token) => {
			const {
				network: { id: networkId }
			} = token;

			return (
				($pseudoNetworkChainFusion &&
					!isTokenIcrcTestnet(token) &&
					token.network.env !== 'testnet') ||
				$selectedNetwork?.id === networkId
			);
		})
);
