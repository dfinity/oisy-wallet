import { enabledSolanaNetworksIds } from '$sol/derived/networks.derived';
import { splDefaultTokensStore } from '$sol/stores/spl-tokens.store';
import type { SplToken } from '$sol/types/spl';
import { derived, type Readable } from 'svelte/store';

const splDefaultTokens: Readable<SplToken[]> = derived(
	[splDefaultTokensStore, enabledSolanaNetworksIds],
	([$splTokensStore, $enabledSolanaNetworksIds]) =>
		($splTokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledSolanaNetworksIds.includes(networkId)
		)
);

export const splTokens: Readable<SplToken[]> = derived(
	[splDefaultTokens],
	([$splDefaultTokens]) => [...$splDefaultTokens]
);

export const enabledSplTokens: Readable<SplToken[]> = derived(
	[splDefaultTokens],
	([$splDefaultTokens]) => [...$splDefaultTokens]
);
