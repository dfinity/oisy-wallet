import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { enabledSolanaNetworksIds } from '$sol/derived/networks.derived';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import { splUserTokensStore } from '$sol/stores/spl-user-tokens.store';
import type { SolanaNetwork } from '$sol/types/network';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import type { SplUserToken } from '$sol/types/spl-user-token';
import { derived, type Readable } from 'svelte/store';

const splDefaultTokens: Readable<SplToken[]> = derived(
	[splDefaultTokensStore, enabledSolanaNetworksIds],
	([$splTokensStore, $enabledSolanaNetworksIds]) =>
		($splTokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledSolanaNetworksIds.includes(networkId)
		)
);

const splDefaultTokensAddresses: Readable<SplTokenAddress[]> = derived(
	[splDefaultTokens],
	([$splDefaultTokens]) => $splDefaultTokens.map(({ address }) => address.toLowerCase())
);

/**
 * The list of SPL tokens the user has added, enabled or disabled. Can contains default tokens for example if user has disabled a default tokens.
 * i.e. default tokens are configured on the client side. If user disable or enable a default tokens, this token is added as a "user token" in the backend.
 */
const splUserTokens: Readable<SplUserToken[]> = derived(
	[splUserTokensStore, enabledSolanaNetworksIds],
	([$splUserTokensStore, $enabledSolanaNetworksIds]) =>
		$splUserTokensStore?.reduce<SplUserToken[]>((acc, { data: token }) => {
			const {
				network: { id: networkId }
			} = token;

			if ($enabledSolanaNetworksIds.includes(networkId)) {
				return [...acc, token];
			}

			return acc;
		}, []) ?? []
);

const splDefaultTokensToggleable: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokens, splUserTokens],
	([$splDefaultTokens, $splUserTokens]) =>
		$splDefaultTokens.map(({ address, network, ...rest }) => {
			const userToken = $splUserTokens.find(
				({ address: contractAddress, network: contractNetwork }) =>
					contractAddress === address &&
					(network as SolanaNetwork).chainId === (contractNetwork as SolanaNetwork).chainId
			);

			return mapDefaultTokenToToggleable({
				defaultToken: {
					address,
					network,
					...rest
				},
				userToken
			});
		})
);

/**
 * The list of default tokens that are enabled - i.e. the list of default SPL tokens minus those disabled by the user.
 */
const enabledSplDefaultTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensToggleable],
	([$splDefaultTokensToggleable]) => $splDefaultTokensToggleable.filter(({ enabled }) => enabled)
);

const splUserTokensToggleable: Readable<SplUserToken[]> = derived(
	[splUserTokens, splDefaultTokensAddresses],
	([$splUserTokens, $splDefaultTokensAddresses]) =>
		$splUserTokens.filter(
			({ address }) => !$splDefaultTokensAddresses.includes(address.toLowerCase())
		)
);

const enabledSplUserTokens: Readable<SplUserToken[]> = derived(
	[splUserTokens],
	([$splUserTokens]) => $splUserTokens.filter(({ enabled }) => enabled)
);

/**
 * The list of all SPL tokens.
 */
export const splTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensToggleable, splUserTokensToggleable],
	([$splDefaultTokensToggleable, $splUserTokensToggleable]) => [
		...$splDefaultTokensToggleable,
		...$splUserTokensToggleable
	]
);

/**
 * The list of SPL tokens that are either enabled by default (static config) or enabled by the users regardless if they are custom or default.
 */
export const enabledSplTokens: Readable<SplTokenToggleable[]> = derived(
	[enabledSplDefaultTokens, enabledSplUserTokens],
	([$enabledSplDefaultTokens, $enabledSplUserTokens]) => [
		...$enabledSplDefaultTokens,
		...$enabledSplUserTokens
	]
);

export const enabledSplTokenAddresses: Readable<SplTokenAddress[]> = derived(
	[enabledSplTokens],
	([$enabledSplTokens]) => $enabledSplTokens.map(({ address }) => address)
);
