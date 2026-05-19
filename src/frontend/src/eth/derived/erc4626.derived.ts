import { enabledEthereumNetworksIds } from '$eth/derived/networks.derived';
import { erc4626CustomTokensStore } from '$eth/stores/erc4626-custom-tokens.store';
import { erc4626DefaultTokensStore } from '$eth/stores/erc4626-default-tokens.store';
import type {
	Erc4626ContractAddressWithNetwork,
	Erc4626Token,
	Erc4626TokensExchangeData
} from '$eth/types/erc4626';
import type { Erc4626CustomToken } from '$eth/types/erc4626-custom-token';
import { enabledEvmNetworksIds } from '$evm/derived/networks.derived';
import { mapAddressStartsWith0x } from '$icp-eth/utils/eth.utils';
import { mapDefaultTokenToToggleable } from '$lib/utils/token.utils';
import { derived, type Readable } from 'svelte/store';

export const erc4626DefaultTokens: Readable<Erc4626Token[]> = derived(
	[erc4626DefaultTokensStore, enabledEthereumNetworksIds, enabledEvmNetworksIds],
	([$erc4626TokensStore, $enabledEthereumNetworksIds, $enabledEvmNetworksIds]) => {
		const enabledNetworkIds = new Set([...$enabledEthereumNetworksIds, ...$enabledEvmNetworksIds]);

		return ($erc4626TokensStore ?? []).filter(({ network: { id: networkId } }) =>
			enabledNetworkIds.has(networkId)
		);
	}
);

export const erc4626CustomTokens: Readable<Erc4626CustomToken[]> = derived(
	[erc4626CustomTokensStore, enabledEthereumNetworksIds, enabledEvmNetworksIds],
	([$erc4626CustomTokensStore, $enabledEthereumNetworksIds, $enabledEvmNetworksIds]) => {
		const enabledNetworkIds = new Set([...$enabledEthereumNetworksIds, ...$enabledEvmNetworksIds]);

		return (
			$erc4626CustomTokensStore?.reduce<Erc4626CustomToken[]>((acc, { data: token }) => {
				if (enabledNetworkIds.has(token.network.id)) {
					acc.push(token);
				}

				return acc;
			}, []) ?? []
		);
	}
);

const erc4626DefaultTokensToggleable: Readable<Erc4626CustomToken[]> = derived(
	[erc4626DefaultTokens, erc4626CustomTokens],
	([$erc4626DefaultTokens, $erc4626CustomTokens]) => {
		const customTokenByAddressAndChainId = new Map(
			$erc4626CustomTokens.map((token) => [`${token.address}|${token.network.chainId}`, token])
		);

		return $erc4626DefaultTokens.map(({ address, network, ...rest }) =>
			mapDefaultTokenToToggleable({
				defaultToken: {
					address,
					network,
					...rest
				},
				customToken: customTokenByAddressAndChainId.get(`${address}|${network.chainId}`)
			})
		);
	}
);

const enabledErc4626DefaultTokens: Readable<Erc4626CustomToken[]> = derived(
	[erc4626DefaultTokensToggleable],
	([$erc4626DefaultTokensToggleable]) =>
		$erc4626DefaultTokensToggleable.filter(({ enabled }) => enabled)
);

const erc4626CustomTokensToggleable: Readable<Erc4626CustomToken[]> = derived(
	[erc4626CustomTokens, erc4626DefaultTokens],
	([$erc4626CustomTokens, $erc4626DefaultTokens]) => {
		const defaultTokenKeys = new Set(
			$erc4626DefaultTokens.map(
				({ address, network: { chainId } }) =>
					`${mapAddressStartsWith0x(address).toLowerCase()}|${chainId}`
			)
		);

		return $erc4626CustomTokens.filter(
			({ address, network: { chainId } }) =>
				!defaultTokenKeys.has(`${mapAddressStartsWith0x(address).toLowerCase()}|${chainId}`)
		);
	}
);

const enabledErc4626CustomTokens: Readable<Erc4626CustomToken[]> = derived(
	[erc4626CustomTokens],
	([$erc4626CustomTokens]) => $erc4626CustomTokens.filter(({ enabled }) => enabled)
);

export const erc4626Tokens: Readable<Erc4626CustomToken[]> = derived(
	[erc4626DefaultTokensToggleable, erc4626CustomTokensToggleable],
	([$erc4626DefaultTokensToggleable, $erc4626CustomTokensToggleable]) => [
		...$erc4626DefaultTokensToggleable,
		...$erc4626CustomTokensToggleable
	]
);

export const enabledErc4626Tokens: Readable<Erc4626CustomToken[]> = derived(
	[enabledErc4626DefaultTokens, enabledErc4626CustomTokens],
	([$enabledErc4626DefaultTokens, $enabledErc4626CustomTokens]) => [
		...$enabledErc4626DefaultTokens,
		...$enabledErc4626CustomTokens
	]
);

export const erc4626TokensExchangeData: Readable<Erc4626TokensExchangeData[]> = derived(
	[erc4626Tokens],
	([$erc4626Tokens]) =>
		$erc4626Tokens.map(
			({
				address,
				decimals,
				assetAddress,
				assetDecimals,
				network: {
					providers: { infura },
					exchange
				}
			}) => ({
				vaultAddress: address,
				vaultDecimals: decimals,
				assetAddress,
				assetDecimals,
				exchange,
				infura
			})
		)
);

export const erc4626CustomTokensInitialized: Readable<boolean> = derived(
	[erc4626CustomTokensStore],
	([$erc4626CustomTokensStore]) => $erc4626CustomTokensStore !== undefined
);

export const erc4626CustomTokensNotInitialized: Readable<boolean> = derived(
	[erc4626CustomTokensInitialized],
	([$erc4626CustomTokensInitialized]) => !$erc4626CustomTokensInitialized
);

export const erc4626AssetAddresses: Readable<Erc4626ContractAddressWithNetwork[]> = derived(
	[erc4626Tokens],
	([$erc4626Tokens]) =>
		$erc4626Tokens.map(({ assetAddress, network: { exchange, chainId } }) => ({
			address: assetAddress,
			coingeckoId: exchange?.coingeckoId ?? 'ethereum',
			chainId
		}))
);
