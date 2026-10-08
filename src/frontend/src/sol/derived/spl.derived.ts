import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { enabledSolanaNetworksIds } from '$sol/derived/networks.derived';
import { splCustomTokensStore } from '$sol/stores/spl-custom-tokens.store';
import { splDefaultTokensStore } from '$sol/stores/spl-default-tokens.store';
import type { SolanaNetwork } from '$sol/types/network';
import type { SplToken, SplTokenAddress } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { derived, type Readable } from 'svelte/store';

export const splDefaultTokens: Readable<SplToken[]> = derived(
	[splDefaultTokensStore, enabledSolanaNetworksIds],
	([$splTokensStore, $enabledSolanaNetworksIds]) => {
		const enabledNetworkIds = new Set($enabledSolanaNetworksIds);

		return ($splTokensStore ?? []).filter(({ network: { id: networkId } }) =>
			enabledNetworkIds.has(networkId)
		);
	}
);

const splDefaultTokensAddresses: Readable<SplTokenAddress[]> = derived(
	[splDefaultTokens],
	([$splDefaultTokens]) => $splDefaultTokens.map(({ address }) => address.toLowerCase())
);

/**
 * The list of SPL tokens the user has added, enabled or disabled.
 * Can contain default tokens, for example, if the user has disabled a default token.
 * i.e. default tokens are configured on the client side.
 * If a user disables or enables a default token, this token is added as a "user token" in the backend.
 */
const splCustomTokens: Readable<SplCustomToken[]> = derived(
	[splCustomTokensStore, enabledSolanaNetworksIds],
	([$splCustomTokensStore, $enabledSolanaNetworksIds]) => {
		const enabledNetworkIds = new Set($enabledSolanaNetworksIds);

		return (
			$splCustomTokensStore?.reduce<SplCustomToken[]>((acc, { data: token }) => {
				if (enabledNetworkIds.has(token.network.id)) {
					acc.push(token);
				}

				return acc;
			}, []) ?? []
		);
	}
);

const splDefaultTokensToggleable: Readable<SplCustomToken[]> = derived(
	[splDefaultTokens, splCustomTokens],
	([$splDefaultTokens, $splCustomTokens]) => {
		const customTokenByAddressAndChainId = new Map(
			$splCustomTokens.map((token) => [
				`${token.address}|${(token.network as SolanaNetwork).chainId}`,
				token
			])
		);

		return $splDefaultTokens.map(({ address, network, ...rest }) =>
			mapDefaultTokenToToggleable({
				defaultToken: {
					address,
					network,
					...rest
				},
				customToken: customTokenByAddressAndChainId.get(
					`${address}|${(network as SolanaNetwork).chainId}`
				)
			})
		);
	}
);

/**
 * The list of default tokens that are enabled - i.e. the list of default SPL tokens minus those disabled by the user.
 */
const enabledSplDefaultTokens: Readable<SplCustomToken[]> = derived(
	[splDefaultTokensToggleable],
	([$splDefaultTokensToggleable]) => $splDefaultTokensToggleable.filter(({ enabled }) => enabled)
);

const splCustomTokensToggleable: Readable<SplCustomToken[]> = derived(
	[splCustomTokens, splDefaultTokensAddresses],
	([$splCustomTokens, $splDefaultTokensAddresses]) => {
		const defaultTokensAddresses = new Set($splDefaultTokensAddresses);

		return $splCustomTokens.filter(
			({ address }) => !defaultTokensAddresses.has(address.toLowerCase())
		);
	}
);

const enabledSplCustomTokens: Readable<SplCustomToken[]> = derived(
	[splCustomTokens],
	([$splCustomTokens]) => $splCustomTokens.filter(({ enabled }) => enabled)
);

/**
 * The list of all SPL tokens.
 */
export const splTokens: Readable<SplCustomToken[]> = derived(
	[splDefaultTokensToggleable, splCustomTokensToggleable],
	([$splDefaultTokensToggleable, $splCustomTokensToggleable]) => [
		...$splDefaultTokensToggleable,
		...$splCustomTokensToggleable
	]
);

/**
 * The list of SPL tokens that are either enabled by default (static config) or enabled by the users regardless if they are custom or default.
 */
export const enabledSplTokens: Readable<SplCustomToken[]> = derived(
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

export const splCustomTokensInitialized: Readable<boolean> = derived(
	[splCustomTokensStore],
	([$splCustomTokensStore]) => $splCustomTokensStore !== undefined
);

export const splCustomTokensNotInitialized: Readable<boolean> = derived(
	[splCustomTokensInitialized],
	([$splCustomTokensInitialized]) => !$splCustomTokensInitialized
);
