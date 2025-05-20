import { selectedEvmNetwork } from '$evm/derived/network.derived';
import { enabledEvmTokens } from '$evm/derived/tokens.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const evmNativeToken: Readable<RequiredToken | undefined> = derived(
	[enabledEvmTokens, selectedEvmNetwork],
	([$enabledEvmTokens, $selectedEvmNetwork]) =>
		$enabledEvmTokens.find(
			({ network: { id: networkId } }) => $selectedEvmNetwork?.id === networkId
		)
);
