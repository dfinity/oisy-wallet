import { SUPPORTED_BASE_NETWORKS } from '$env/networks/networks-evm/networks.evm.base.env';
import type { EthereumNetwork } from '$eth/types/network';

export const SUPPORTED_EVM_NETWORKS: EthereumNetwork[] = [...SUPPORTED_BASE_NETWORKS];
