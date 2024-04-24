import { SEPOLIA_NETWORK_ID } from '$env/networks.env';
import type { NetworkId } from '$lib/types/network';

// ckETH helper event signature. Immutable.
export const CKETH_HELPER_CONTRACT_SIGNATURES: Record<NetworkId, string> = {
	[SEPOLIA_NETWORK_ID]: '0x257e057bb61920d8d0ed2cb7b720ac7f9c513cd1110bc9fa543079154f45f435'
};

// ckErc20 helper event signature. Same for all Erc20 helpers. Immutable.
export const CKERC20_HELPER_CONTRACT_SIGNATURES: Record<NetworkId, string> = {
	[SEPOLIA_NETWORK_ID]: '0x4d69d0bd4287b7f66c548f90154dc81bc98f65a1b362775df5ae171a2ccd262b'
};
