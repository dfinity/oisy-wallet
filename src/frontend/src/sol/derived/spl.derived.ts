import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { enabledSolanaNetworksIds } from '$sol/derived/networks.derived';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SolanaNetwork } from '$sol/types/network';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import type { SplTokenToggleable } from '$sol/types/spl-token-toggleable';
import { derived, type Readable } from 'svelte/store';

export const splDefaultTokens: Readable<SplToken[]> = derived(
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
const splCustomTokens: Readable<SplCustomToken[]> = derived(
	[splCustomTokensStore, enabledSolanaNetworksIds],
	([$splCustomTokensStore, $enabledSolanaNetworksIds]) =>
		$splCustomTokensStore?.reduce<SplCustomToken[]>((acc, { data: token }) => {
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
	[splDefaultTokens, splCustomTokens],
	([$splDefaultTokens, $splCustomTokens]) =>
		$splDefaultTokens.map(({ address, network, ...rest }) => {
			const customToken = $splCustomTokens.find(
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
				customToken
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

const splCustomTokensToggleable: Readable<SplCustomToken[]> = derived(
	[splCustomTokens, splDefaultTokensAddresses],
	([$splCustomTokens, $splDefaultTokensAddresses]) =>
		$splCustomTokens.filter(
			({ address }) => !$splDefaultTokensAddresses.includes(address.toLowerCase())
		)
);

const enabledSplCustomTokens: Readable<SplCustomToken[]> = derived(
	[splCustomTokens],
	([$splCustomTokens]) => $splCustomTokens.filter(({ enabled }) => enabled)
);

/**
 * The list of all SPL tokens.
 */
export const splTokens: Readable<SplTokenToggleable[]> = derived(
	[splDefaultTokensToggleable, splCustomTokensToggleable],
	([$splDefaultTokensToggleable, $splCustomTokensToggleable]) => [
		...$splDefaultTokensToggleable,
		...$splCustomTokensToggleable
	]
);

/**
 * The list of SPL tokens that are either enabled by default (static config) or enabled by the users regardless if they are custom or default.
 */
export const enabledSplTokens: Readable<SplTokenToggleable[]> = derived(
	[enabledSplDefaultTokens, enabledSplCustomTokens],
	([$enabledSplDefaultTokens, $enabledSplCustomTokens]) => [
		...$enabledSplDefaultTokens,
		...$enabledSplCustomTokens
	]
);

export const enabledSplTokenAddresses: Readable<SplTokenAddress[]> = derived(
	[enabledSplTokens],
	([$enabledSplTokens]) => [
		...new Map(
			$enabledSplTokens.map(({ address, owner }) => [`${address}|${owner}`, address])
		).values()
	]
);
