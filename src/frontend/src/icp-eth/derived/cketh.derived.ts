import { ETHEREUM_NETWORK } from '$env/networks.env';
import { ETHEREUM_TOKEN } from '$env/tokens.env';
import { ERC20_TWIN_TOKENS_IDS } from '$env/tokens.erc20.env';
import { ethereumTokenId } from '$eth/derived/token.derived';
import { enabledEthereumTokens } from '$eth/derived/tokens.derived';
import type { EthereumNetwork } from '$eth/types/network';
import { ckEthMinterInfoStore } from '$icp-eth/stores/cketh.store';
import {
	toCkErc20HelperContractAddress,
	toCkEthHelperContractAddress
} from '$icp-eth/utils/cketh.utils';
import type { IcCkToken, IcToken } from '$icp/types/ic';
import { isTokenCkErc20Ledger, isTokenCkEthLedger } from '$icp/utils/ic-send.utils';
import { DEFAULT_ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { token, tokenStandard } from '$lib/derived/token.derived';
import { balancesStore } from '$lib/stores/balances.store';
import type { OptionAddress } from '$lib/types/address';
import type { NetworkId } from '$lib/types/network';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import type { BigNumber } from '@ethersproject/bignumber';
import { derived, type Readable } from 'svelte/store';

/**
 * ETH to ckETH is supported:
 * - on network Ethereum if the token is Ethereum (and not some ERC20 token)
 * - on network ICP if the token is ckETH
 */
export const ethToCkETHEnabled: Readable<boolean> = derived(
	[tokenStandard, token],
	([$tokenStandard, $token]) =>
		$tokenStandard === 'ethereum' || isTokenCkEthLedger($token as IcToken)
);

/**
 * ERC20 to ckErc20 is supported:
 * - on network Ethereum if the token is a known Erc20 twin tokens
 * - on network ICP if the token is ckErc20
 */
export const erc20ToCkErc20Enabled: Readable<boolean> = derived(
	[token],
	([$token]) => ERC20_TWIN_TOKENS_IDS.includes($token.id) || isTokenCkErc20Ledger($token as IcToken)
);

/**
 * On ckETH, we need to know if the target for conversion is Ethereum mainnet or Sepolia.
 */
export const ckEthereumTwinToken: Readable<Token> = derived(
	[token],
	([$token]) => ($token as IcCkToken)?.twinToken ?? ETHEREUM_TOKEN
);

export const ckEthereumTwinTokenId: Readable<TokenId> = derived(
	[ckEthereumTwinToken],
	([{ id }]) => id
);

export const ckEthereumTwinTokenStandard: Readable<TokenStandard> = derived(
	[ckEthereumTwinToken],
	([{ standard }]) => standard
);

export const ckEthereumTwinTokenNetwork: Readable<EthereumNetwork> = derived(
	[ckEthereumTwinToken],
	([{ network }]) => (network as EthereumNetwork | undefined) ?? ETHEREUM_NETWORK
);

export const ckEthereumTwinTokenNetworkId: Readable<NetworkId> = derived(
	[ckEthereumTwinTokenNetwork],
	([{ id }]) => id
);

/**
 * The fees to convert from Erc20 to ckErc20 or Eth to ckEth are covered by Ethereum (mainnet or sepolia) - i.e. not in erc20 value.
 */
export const ckEthereumFeeToken: Readable<Token> = derived(
	[enabledEthereumTokens, ckEthereumTwinToken],
	([$enabledEthereumTokens, { id }]) =>
		$enabledEthereumTokens.find(({ network: { id: networkId } }) => id === networkId) ??
		DEFAULT_ETHEREUM_TOKEN
);

export const ckEthereumFeeTokenBalance: Readable<BigNumber | undefined | null> = derived(
	[balancesStore, ckEthereumFeeToken],
	([$balanceStore, { id }]) => $balanceStore?.[id]?.data
);

/**
 * The contract helper used to convert ETH -> ckETH.
 */
export const ckEthHelperContractAddress: Readable<OptionAddress> = derived(
	[ckEthMinterInfoStore, ethereumTokenId],
	([$ckEthMinterInfoStore, $ethereumTokenId]) =>
		toCkEthHelperContractAddress($ckEthMinterInfoStore?.[$ethereumTokenId])
);

/**
 * The contract helper used to convert Erc20 -> ckErc20.
 */
export const ckErc20HelperContractAddress: Readable<OptionAddress> = derived(
	[ckEthMinterInfoStore, ethereumTokenId],
	([$ckEthMinterInfoStore, $ethereumTokenId]) =>
		toCkErc20HelperContractAddress($ckEthMinterInfoStore?.[$ethereumTokenId])
);
