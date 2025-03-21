import { BASE_MAINNET_ENABLED } from '$env/networks/networks-evm/networks.evm.base.env';
import {
	BASE_ETHEREUM_TOKEN,
	BASE_SEPOLIA_TOKEN
} from '$env/tokens/tokens-evm/tokens-base/tokens.eth.env';
import { testnets } from '$lib/derived/testnets.derived';
import type { RequiredToken } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const enabledBaseTokens: Readable<RequiredToken[]> = derived([testnets], ([$testnets]) => [
	...(BASE_MAINNET_ENABLED ? [BASE_ETHEREUM_TOKEN] : []),
	...($testnets ? [BASE_SEPOLIA_TOKEN] : [])
]);
