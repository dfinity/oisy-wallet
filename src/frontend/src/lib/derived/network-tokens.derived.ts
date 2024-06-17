import { isTokenIcrcTestnet } from '$icp/utils/icrc-ledger.utils';
import { selectedNetwork } from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { Token, TokenInList } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork],
	([$tokens, $selectedNetwork]) =>
		$tokens.filter((token) => {
			const {
				network: { id: networkId }
			} = token;

			return (
				(isNullish($selectedNetwork) &&
					!isTokenIcrcTestnet(token) &&
					token.network.env !== 'testnet') ||
				$selectedNetwork?.id === networkId
			);
		})
);

export const manageableNetworkTokens: Readable<TokenInList[]> = derived(
	[networkTokens],
	([$networkTokens]) => $networkTokens.map((token) => ({ enabled: true, ...token }))
);

export const enabledNetworkTokens: Readable<TokenInList[]> = derived(
	[manageableNetworkTokens],
	([$manageableNetworkTokens]) => $manageableNetworkTokens.filter(({ enabled }) => enabled)
);
