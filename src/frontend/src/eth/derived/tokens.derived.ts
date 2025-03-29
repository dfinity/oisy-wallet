import { ETH_MAINNET_ENABLED } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredTokenWithLinkedData } from '$lib/types/token';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumTokens: Readable<RequiredTokenWithLinkedData[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		[
			...(ETH_MAINNET_ENABLED ? [ETHEREUM_TOKEN] : []),
			...($testnetsEnabled ? [SEPOLIA_TOKEN] : [])
		].filter(({ network: { id: networkId } }) =>
			isUserNetworkEnabled({ userNetworks: $userNetworks, networkId })
		)
);
