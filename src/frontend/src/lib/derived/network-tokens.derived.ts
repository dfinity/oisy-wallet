import { selectedNetwork } from '$lib/derived/network.derived';
import { tokens } from '$lib/derived/tokens.derived';
import type { Token } from '$lib/types/token';
import { isNetworkIdChainFusion } from '$lib/utils/network.utils';
import { derived, type Readable } from 'svelte/store';

export const networkTokens: Readable<Token[]> = derived(
	[tokens, selectedNetwork],
	([$tokens, $selectedNetwork]) =>
		$tokens.filter(
			({ network: { id, env } }) =>
				(isNetworkIdChainFusion($selectedNetwork.id) && env === $selectedNetwork.env) ||
				id === $selectedNetwork.id
		)
);
