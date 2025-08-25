import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { ContractAddressText } from '$eth/types/address';
import type { Erc20Token } from '$eth/types/erc20';
import type { Erc20TokenToggleable } from '$eth/types/erc20-token-toggleable';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import type { EthereumNetwork } from '$eth/types/network';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of ERC20 default tokens - i.e. the statically configured ERC20 tokens of Oisy + their metadata, unique ids etc. fetched at runtime.
 */
const erc20DefaultTokens: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokensStore, enabledEthereumNetworksIds],
	([$erc20TokensStore, $enabledEthereumNetworksIds]) =>
		($erc20TokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledEthereumNetworksIds.includes(networkId)
		)
);

/**
 * A flatten list of the default ERC20 contract addresses.
 */
const erc20DefaultTokensAddresses: Readable<string[]> = derived(
	[erc20DefaultTokens],
	([$erc20DefaultTokens]) =>
		$erc20DefaultTokens.map(({ address }) => mapAddressStartsWith0x(address).toLowerCase())
);

/**
 * The list of ERC20 tokens the user has added, enabled or disabled. Can contains default tokens for example if user has disabled a default tokens.
 * i.e. default tokens are configured on the client side. If user disable or enable a default tokens, this token is added as a "user token" in the backend.
 */
const erc20UserTokens: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokensStore],
	([$erc20UserTokensStore]) => $erc20UserTokensStore?.map(({ data: token }) => token) ?? []
);

const erc20DefaultTokensToggleable: Readable<Erc20TokenToggleable[]> = derived(
	[erc20DefaultTokens, erc20UserTokens],
	([$erc20DefaultTokens, $erc20UserTokens]) =>
		$erc20DefaultTokens.map(({ address, network, ...rest }) => {
			const userToken = $erc20UserTokens.find(
				({ address: contractAddress, network: contractNetwork }) =>
					contractAddress === address &&
					(network as EthereumNetwork).chainId === (contractNetwork as EthereumNetwork).chainId
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
 * The list of default tokens that are enabled - i.e. the list of default ERC20 tokens minus those disabled by the user.
 */
const enabledErc20DefaultTokens: Readable<Erc20TokenToggleable[]> = derived(
	[erc20DefaultTokensToggleable],
	([$erc20DefaultTokensToggleable]) =>
		$erc20DefaultTokensToggleable.filter(({ enabled }) => enabled)
);

/**
 * The list of ERC20 tokens enabled by the user - i.e. saved in the backend canister as enabled - minus those that duplicate default tokens.
 * We do so because the default statically configured are those to be used for various feature. This is notably useful for ERC20 <> ckERC20 conversion given that tokens on both sides (ETH an IC) should know about each others ("Twin Token" links).
 */
const erc20UserTokensToggleable: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokens, erc20DefaultTokensAddresses],
	([$erc20UserTokens, $erc20DefaultTokensAddresses]) =>
		$erc20UserTokens.filter(
			({ address }) =>
				!$erc20DefaultTokensAddresses.includes(mapAddressStartsWith0x(address).toLowerCase())
		)
);

const enabledErc20UserTokens: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokens],
	([$erc20UserTokens]) => $erc20UserTokens.filter(({ enabled }) => enabled)
);

/**
 * The list of all ERC20 tokens.
 */
export const erc20Tokens: Readable<Erc20TokenToggleable[]> = derived(
	[erc20DefaultTokensToggleable, erc20UserTokensToggleable],
	([$erc20DefaultTokensToggleable, $erc20UserTokensToggleable]) => [
		...$erc20DefaultTokensToggleable,
		...$erc20UserTokensToggleable
	]
);

/**
 * The list of ERC20 tokens that are either enabled by default (static config) or enabled by the users regardless if they are custom or default.
 */
export const enabledErc20Tokens: Readable<Erc20TokenToggleable[]> = derived(
	[enabledErc20DefaultTokens, enabledErc20UserTokens],
	([$enabledErc20DefaultTokens, $enabledErc20UserTokens]) => [
		...$enabledErc20DefaultTokens,
		...$enabledErc20UserTokens
	]
);

export const enabledErc20TokensAddresses: Readable<ContractAddressText[]> = derived(
	[enabledErc20Tokens],
	([$enabledErc20Tokens]) => $enabledErc20Tokens.map(({ address }: Erc20Token) => address)
);

export const erc20UserTokensInitialized: Readable<boolean> = derived(
	[erc20UserTokensStore],
	([$erc20UserTokensStore]) => $erc20UserTokensStore !== undefined
);

export const erc20UserTokensNotInitialized: Readable<boolean> = derived(
	[erc20UserTokensInitialized],
	([$erc20TokensInitialized]) => !$erc20TokensInitialized
);
