import { BASE_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BASE_ETH_TOKEN,
	BASE_SEPOLIA_ETH_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledBaseTokens: Readable<RequiredToken[]> = derived(
	[testnetsEnabled],
	([$testnetsEnabled]) => [
		...(BASE_MAINNET_ENABLED ? [BASE_ETH_TOKEN] : []),
		...($testnetsEnabled ? [BASE_SEPOLIA_ETH_TOKEN] : [])
	]
);
