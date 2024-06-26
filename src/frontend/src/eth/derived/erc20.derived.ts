import { ERC20_CONTRACTS_ADDRESSES } from '$env/tokens.erc20.env';
import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc20DefaultTokensStore } from '$eth/stores/erc20-default-tokens.store';
import { erc20UserTokensStore } from '$eth/stores/erc20-user-tokens.store';
import type { Erc20ContractAddress, Erc20Token } from '$eth/types/erc20';
import type { Erc20UserToken } from '$eth/types/erc20-user-token';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

/**
 * The list of ERC20 default tokens - i.e. the statically configured ERC20 tokens of Oisy + their metadata, unique ids etc. fetched at runtime.
 */
// TODO: check usage is still up-to-date
export const erc20DefaultTokens: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokensStore, enabledEthereumNetworksIds],
	([$erc20TokensStore, $enabledEthereumNetworksIds]) =>
		($erc20TokensStore ?? []).filter(({ network: { id: networkId } }) =>
			$enabledEthereumNetworksIds.includes(networkId)
		)
);

/**
 * The list of ERC20 tokens the user has added, enabled or enabled. Can contains default tokens if user disabled some.
 */
// TODO: check usage is still up-to-date
export const erc20UserTokens: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokensStore],
	([$erc20UserTokensStore]) => $erc20UserTokensStore?.map(({ data: token }) => token) ?? []
);

/**
 * The list of ERC20 tokens the user has disabled.
 * Note: Instead of deriving an array of Erc20Token we derive addresses, that way we can check if a default token is enabled more efficiently.
 */
const erc20UserTokensDisabledAddresses: Readable<string[]> = derived(
	[erc20UserTokens],
	([$erc20UserTokens]) =>
		$erc20UserTokens?.reduce(
			(acc, { address, enabled }) => [...acc, ...(!enabled ? [address] : [])],
			[] as string[]
		)
);

/**
 * The list of default tokens that are enabled - i.e. the list of default ERC20 tokens minus those disabled by the user.
 */
const erc20DefaultTokensEnabled: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokens, erc20UserTokensDisabledAddresses],
	([$erc20DefaultTokens, $erc20UserTokensDisabledAddresses]) =>
		$erc20DefaultTokens.filter(
			({ address }) => !$erc20UserTokensDisabledAddresses.includes(address)
		)
);

/**
 * The list of ERC20 tokens enabled by the user - i.e. saved in the backend canister as enabled - minus those that duplicate default tokens.
 * We do so because the default statically configured are those to be used for various feature. This is notably useful for ERC20 <> ckERC20 conversion given that tokens on both sides (ETH an IC) should know about each others ("Twin Token" links).
 */
const erc20UserTokensEnabled: Readable<Erc20UserToken[]> = derived(
	[erc20UserTokens],
	([$erc20UserTokens]) =>
		$erc20UserTokens.filter(
			({ enabled, address }) =>
				enabled &&
				!ERC20_CONTRACTS_ADDRESSES.includes(mapAddressStartsWith0x(address).toLowerCase())
		)
);

export const erc20Tokens: Readable<Erc20Token[]> = derived(
	[erc20DefaultTokensEnabled, erc20UserTokensEnabled],
	([$erc20DefaultTokensEnabled, $erc20UserTokensEnabled]) => [
		...$erc20DefaultTokensEnabled,
		...$erc20UserTokensEnabled
	]
);

// TODO: rename to erc20UserTokensInitialized
export const erc20TokensInitialized: Readable<boolean> = derived(
	[erc20UserTokensStore],
	([$erc20UserTokensStore]) => nonNullish($erc20UserTokensStore)
);

export const erc20TokensNotInitialized: Readable<boolean> = derived(
	[erc20TokensInitialized],
	([$erc20TokensInitialized]) => !$erc20TokensInitialized
);

export const erc20TokensAddresses: Readable<Erc20ContractAddress[]> = derived(
	[erc20Tokens],
	([$erc20Tokens]) => $erc20Tokens.map(({ address }: Erc20Token) => ({ address }))
);
