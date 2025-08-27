import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens/tokens.erc20.env';
import { ETHEREUM_TOKEN } from '$env/tokens/tokens.eth.env';
import { selectedEthereumNetwork } from '$eth/derived/network.derived';
import { enabledEthereumNetworks } from '$eth/derived/networks.derived';
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
import { tokenWithFallback } from '$lib/derived/token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionEthAddress } from '$lib/types/address';
import type { OptionBalance } from '$lib/types/balance';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { nonNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

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

export const ckEthereumNativeTokenEnabledNetwork: Readable<EthereumNetwork | undefined> = derived(
	[enabledEthereumNetworks, ckEthereumTwinToken],
	([
		$enabledEthereumNetworks,
		{
			network: { id }
		}
	]) => $enabledEthereumNetworks.find(({ id: networkId }) => id === networkId)
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

/**
 * ETH to ckETH is supported:
 * - on network Ethereum if the token is Ethereum (and not some ERC20 token) and the network is enabled
 * - on network ICP if the token is ckETH
 */
export const ethToCkETHEnabled: Readable<boolean> = derived(
	[tokenWithFallbackAsIcToken, selectedEthereumNetwork, ckEthereumNativeTokenEnabledNetwork],
	([$tokenWithFallbackAsIcToken, $selectedEthereumNetwork, $ckEthereumNativeTokenEnabledNetwork]) =>
		($tokenWithFallbackAsIcToken.standard === 'ethereum' && nonNullish($selectedEthereumNetwork)) ||
		(isTokenCkEthLedger($tokenWithFallbackAsIcToken) &&
			nonNullish($ckEthereumNativeTokenEnabledNetwork))
);

/**
 * ERC20 to ckErc20 is supported:
 * - on network Ethereum if the token is a known Erc20 twin tokens and the network is enabled
 * - on network ICP if the token is ckErc20
 * - when Ethereum network is selected (enabled)
 */
export const erc20ToCkErc20Enabled: Readable<boolean> = derived(
	[tokenWithFallbackAsIcToken, selectedEthereumNetwork, ckEthereumNativeTokenEnabledNetwork],
	([$tokenWithFallbackAsIcToken, $selectedEthereumNetwork, $ckEthereumNativeTokenEnabledNetwork]) =>
		(ERC20_TWIN_TOKENS_IDS.includes($tokenWithFallbackAsIcToken.id) &&
			nonNullish($selectedEthereumNetwork)) ||
		(isTokenCkErc20Ledger($tokenWithFallbackAsIcToken) &&
			nonNullish($ckEthereumNativeTokenEnabledNetwork))
);
