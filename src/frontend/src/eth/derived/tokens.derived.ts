import { ETH_MAINNET_ENABLED } from '$env/networks/networks.eth.env';
import { ETHEREUM_TOKEN, SEPOLIA_TOKEN } from '$env/tokens/tokens.eth.env';
import { erc1155CustomTokens } from '$eth/derived/erc1155.derived';
import { erc721CustomTokens } from '$eth/derived/erc721.derived';
import type { Erc1155CustomToken } from '$eth/types/erc1155-custom-token';
import type { Erc721CustomToken } from '$eth/types/erc721-custom-token';
import { testnetsEnabled } from '$lib/derived/testnets.derived';
import { userNetworks } from '$lib/derived/user-networks.derived';
import type { RequiredTokenWithLinkedData } from '$lib/types/token';
import { defineEnabledTokens } from '$lib/utils/tokens.utils';
import { derived, type Readable } from 'svelte/store';

export const enabledEthereumTokens: Readable<RequiredTokenWithLinkedData[]> = derived(
	[testnetsEnabled, userNetworks],
	([$testnetsEnabled, $userNetworks]) =>
		defineEnabledTokens({
			$testnetsEnabled,
			$userNetworks,
			mainnetFlag: ETH_MAINNET_ENABLED,
			mainnetTokens: [ETHEREUM_TOKEN],
			testnetTokens: [SEPOLIA_TOKEN]
		})
);

export const nonFungibleCustomTokens: Readable<(Erc721CustomToken | Erc1155CustomToken)[]> =
	derived(
		[erc721CustomTokens, erc1155CustomTokens],
		([$erc721CustomTokens, $erc1155CustomTokens]) => [
			...$erc721CustomTokens,
			...$erc1155CustomTokens
		]
	);
