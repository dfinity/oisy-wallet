import { chainFusionOnlyTestnets } from '$lib/derived/chain-fusion.derived';
import { selectedNetwork } from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { Token } from '$lib/types/token';
import { isTokenTestnet } from '$lib/utils/token.utils';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork, chainFusionOnlyTestnets],
	([$tokens, $selectedNetwork, $chainFusionOnlyTestnets]) =>
		$tokens.filter((token) => {
			const {
				network: { id: networkId }
			} = token;

			return (
				(isNullish($selectedNetwork) &&
					($chainFusionOnlyTestnets ? isTokenTestnet(token) : !isTokenTestnet(token))) ||
				$selectedNetwork?.id === networkId
			);
		})
);
