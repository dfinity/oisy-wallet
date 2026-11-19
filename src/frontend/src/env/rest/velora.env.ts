import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { BSC_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.bsc.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ROBINHOOD_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.robinhood.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import type { EthAddress } from '$eth/types/address';
import type { NetworkId } from '$lib/types/network';

const VELORA_DELTA = '0x0000000000bbf5c5fd284e657f01bd000933c96d';

const VELORA_AUGUSTUS_V6_2 = '0x6a000f20005980200259b80c5102003040001068';

/**
 * The Velora Delta contract — the spender of a Delta swap's approval or permit, and the verifying
 * contract its order is signed for — per network.
 *
 * Pinned from https://velora.xyz/docs/api/velora-api/velora-delta-api/contracts and never taken from
 * the API, whose answers are unsigned. A network without an entry has no Delta swap.
 */
export const VELORA_DELTA_ADDRESSES: Partial<Record<NetworkId, EthAddress>> = {
	[ETHEREUM_NETWORK_ID]: VELORA_DELTA,
	[ARBITRUM_MAINNET_NETWORK_ID]: VELORA_DELTA,
	[BSC_MAINNET_NETWORK_ID]: VELORA_DELTA,
	[POLYGON_MAINNET_NETWORK_ID]: VELORA_DELTA,
	[BASE_NETWORK_ID]: VELORA_DELTA,
	[ROBINHOOD_MAINNET_NETWORK_ID]: VELORA_DELTA
};

/**
 * Augustus v6.2 — the call target and the ERC-20 spender of a Velora Market swap — per network.
 *
 * Pinned from https://velora.xyz/docs/augustus-swapper/augustus-v6.2-smart-contracts and never taken
 * from the API. Robinhood has no entry: Velora names no Market router there, so it has no Market swap.
 */
export const VELORA_AUGUSTUS_ADDRESSES: Partial<Record<NetworkId, EthAddress>> = {
	[ETHEREUM_NETWORK_ID]: VELORA_AUGUSTUS_V6_2,
	[ARBITRUM_MAINNET_NETWORK_ID]: VELORA_AUGUSTUS_V6_2,
	[BSC_MAINNET_NETWORK_ID]: VELORA_AUGUSTUS_V6_2,
	[POLYGON_MAINNET_NETWORK_ID]: VELORA_AUGUSTUS_V6_2,
	[BASE_NETWORK_ID]: VELORA_AUGUSTUS_V6_2
};
