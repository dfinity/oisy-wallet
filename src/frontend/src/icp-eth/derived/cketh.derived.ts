import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens/tokens.erc20.env';
import { ETHEREUM_TOKEN, ETHEREUM_TOKEN_ID, SEPOLIA_TOKEN_ID } from '$env/tokens/tokens.eth.env';
import { ethereumTokenId } from '$eth/derived/token.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import { tokenWithFallbackAsIcToken } from '$icp/derived/ic-token.derived';
import type { IcCkToken } from '$icp/types/ic-token';
import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { networkEthereumEnabled, networkSepoliaEnabled } from '$lib/derived/networks.derived';
import { tokenStandard, tokenWithFallback } from '$lib/derived/token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { OptionBalance } from '$lib/types/balance';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

/**
 * ETH to ckETH is supported:
 * - on network Ethereum if the token is Ethereum (and not some ERC20 token)
 * - on network ICP if the token is ckETH
 */
export const ethToCkETHEnabled: Readable<boolean> = derived(
	[
		tokenStandard,
		tokenWithFallbackAsIcToken,
		ethereumTokenId,
		networkEthereumEnabled,
		networkSepoliaEnabled
	],
	([
		$tokenStandard,
		$tokenWithFallbackAsIcToken,
		$ethereumTokenId,
		$networkEthereumEnabled,
		$networkSepoliaEnabled
	]) =>
		$tokenStandard === 'ethereum' ||
		(isTokenCkEthLedger($tokenWithFallbackAsIcToken) &&
			// TODO: instead, use nullish checks on selectedEthereumNetwork when it will return undefined too
			(($ethereumTokenId === ETHEREUM_TOKEN_ID && $networkEthereumEnabled) ||
				($ethereumTokenId === SEPOLIA_TOKEN_ID && $networkSepoliaEnabled)))
);

/**
 * ERC20 to ckErc20 is supported:
 * - on network Ethereum if the token is a known Erc20 twin tokens
 * - on network ICP if the token is ckErc20
 */
export const erc20ToCkErc20Enabled: Readable<boolean> = derived(
	[tokenWithFallbackAsIcToken, ethereumTokenId, networkEthereumEnabled, networkSepoliaEnabled],
	([
		$tokenWithFallbackAsIcToken,
		$ethereumTokenId,
		$networkEthereumEnabled,
		$networkSepoliaEnabled
	]) =>
		ERC20_TWIN_TOKENS_IDS.includes($tokenWithFallbackAsIcToken.id) ||
		(isTokenCkErc20Ledger($tokenWithFallbackAsIcToken) &&
			// TODO: instead, use nullish checks on selectedEthereumNetwork when it will return undefined too
			(($ethereumTokenId === ETHEREUM_TOKEN_ID && $networkEthereumEnabled) ||
				($ethereumTokenId === SEPOLIA_TOKEN_ID && $networkSepoliaEnabled)))
);

/**
 * On ckETH, we need to know if the target for conversion is Ethereum mainnet or Sepolia.
 */
export const ckEthereumTwinToken: Readable<Token> = derived(
	[tokenWithFallback],
	([$tokenWithFallback]) => ($tokenWithFallback as IcCkToken)?.twinToken ?? ETHEREUM_TOKEN
);

export const ckEthereumTwinTokenStandard: Readable<TokenStandard> = derived(
	[ckEthereumTwinToken],
	([{ standard }]) => standard
);

export const ckEthereumTwinTokenNetwork: Readable<EthereumNetwork> = derived(
	[ckEthereumTwinToken],
	([{ network }]) => network as EthereumNetwork
);

export const ckEthereumTwinTokenNetworkId: Readable<NetworkId> = derived(
	[ckEthereumTwinTokenNetwork],
	([{ id }]) => id
);

/**
 * The fees to convert from Erc20 to ckErc20 or Eth to ckEth are covered by Ethereum (mainnet or sepolia) - i.e. not in erc20 value.
 * Likewise, when we load ckEth minter information we only load those once per network for any ckErc20 and ckEth given that it contains the information for all Ethereum related tokens.
 */
export const ckEthereumNativeToken: Readable<Token> = derived(
	[enabledEthereumTokens, ckEthereumTwinToken],
	([
		$enabledEthereumTokens,
		{
			network: { id }
		}
	]) =>
		$enabledEthereumTokens.find(({ network: { id: networkId } }) => id === networkId) ??
		DEFAULT_ETHEREUM_TOKEN
);

export const ckEthereumNativeTokenId: Readable<TokenId> = derived(
	[ckEthereumNativeToken],
	([{ id }]) => id
);

export const ckEthereumNativeTokenBalance: Readable<OptionBalance> = derived(
	[balancesStore, ckEthereumNativeToken],
	([$balanceStore, { id }]) => $balanceStore?.[id]?.data
);

/**
 * The contract helper used to convert ETH -> ckETH.
 */
export const ckEthHelperContractAddress: Readable<OptionEthAddress> = derived(
	[ckEthMinterInfoStore, ethereumTokenId],
	([$ckEthMinterInfoStore, $ethereumTokenId]) =>
		toCkEthHelperContractAddress($ckEthMinterInfoStore?.[$ethereumTokenId])
);

/**
 * The contract helper used to convert Erc20 -> ckErc20.
 */
export const ckErc20HelperContractAddress: Readable<OptionEthAddress> = derived(
	[ckEthMinterInfoStore, ethereumTokenId],
	([$ckEthMinterInfoStore, $ethereumTokenId]) =>
		toCkErc20HelperContractAddress($ckEthMinterInfoStore?.[$ethereumTokenId])
);
