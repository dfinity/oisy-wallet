import { ARBITRUM_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.arbitrum.env';
import { BASE_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.base.env';
import { POLYGON_MAINNET_NETWORK_ID } from '$env/networks/networks-evm/networks.evm.polygon.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import type { EthNonFungibleToken } from '$eth/types/nft';
import type { NetworkId } from '$lib/types/network';
import type { NftId } from '$lib/types/nft';
import { areAddressesEqual } from '$lib/utils/address.utils';
import { parseNftId } from '$lib/validation/nft.validation';

// LOCAL SIMULATION ONLY — do not merge.
//
// Fakes possession of a hard-coded list of token ids per contract so NFT-related
// support cases can be reproduced after importing the contract through the UI.
// Only ownership is faked: metadata and media still resolve through Alchemy, so
// the result matches exactly what the affected user sees (e.g. a token whose
// image Alchemy does not index shows no media).
//
// Add contracts / ids here as needed.
const FAKE_OWNED_NFTS: { address: string; networkId: NetworkId; tokenIds: number[] }[] = [
	{
		// MANDARADAN
		address: '0x40ff3db9d64432aB4a91F134e344e79Ea074f7DA',
		networkId: BASE_NETWORK_ID,
		tokenIds: [1, 4, 7, 8, 11]
	},
	{
		// Pudgy Penguins
		address: '0xBd3531dA5CF5857e7CfAA92426877b022e612cf8',
		networkId: ETHEREUM_NETWORK_ID,
		tokenIds: [1, 2, 3]
	},
	{
		// GMX Blueberry Club
		address: '0x17f4BAa9D35Ee54fFbCb2608e20786473c7aa49f',
		networkId: ARBITRUM_MAINNET_NETWORK_ID,
		tokenIds: [1, 4, 5]
	},
	{
		// Lens Protocol Profiles
		address: '0xDb46d1Dc155634FbC732f92E853b10B288AD5a1d',
		networkId: POLYGON_MAINNET_NETWORK_ID,
		tokenIds: [1, 2, 3]
	}
];

export const getFakeOwnedTokenIds = (token: EthNonFungibleToken): NftId[] =>
	FAKE_OWNED_NFTS.filter(
		({ address, networkId }) =>
			token.network.id === networkId &&
			areAddressesEqual({ address1: token.address, address2: address, networkId: token.network.id })
	).flatMap(({ tokenIds }) => tokenIds.map((id) => parseNftId(`${id}`)));
