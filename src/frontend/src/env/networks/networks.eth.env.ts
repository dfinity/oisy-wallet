import type { Networkish } from '@ethersproject/networks';
import { Network } from 'alchemy-sdk';

export const ETH_MAINNET_ENABLED =
	JSON.parse(import.meta.env.VITE_ETHEREUM_MAINNET_DISABLED ?? false) === false;

export const INFURA_NETWORK_HOMESTEAD: Networkish = 'homestead';
export const INFURA_NETWORK_SEPOLIA: Networkish = 'sepolia';

export const ETHERSCAN_NETWORK_HOMESTEAD: Networkish = 'homestead';
export const ETHERSCAN_NETWORK_SEPOLIA: Networkish = 'sepolia';

export const ETHERSCAN_API_URL_HOMESTEAD = 'https://api.etherscan.io/api';
export const ETHERSCAN_API_URL_SEPOLIA = 'https://api-sepolia.etherscan.io/api';

export const ALCHEMY_JSON_RPC_URL_MAINNET = 'https://eth-mainnet.g.alchemy.com/v2';
export const ALCHEMY_JSON_RPC_URL_SEPOLIA = 'https://eth-sepolia.g.alchemy.com/v2';

export const ALCHEMY_NETWORK_MAINNET: Network = Network.ETH_MAINNET;
export const ALCHEMY_NETWORK_SEPOLIA: Network = Network.ETH_SEPOLIA;
