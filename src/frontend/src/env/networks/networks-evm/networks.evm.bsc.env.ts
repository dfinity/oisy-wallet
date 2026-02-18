import { BSC_EXPLORER_URL, BSC_TESTNET_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import bscMainnetIcon from '$lib/assets/networks/bsc-mainnet.svg';
import bscTestnetIcon from '$lib/assets/networks/bsc-testnet.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';
import { bsc, bscTestnet } from 'viem/chains';

export const BSC_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_BSC_MAINNET_DISABLED
);

export const BSC_MAINNET_NETWORK_SYMBOL = 'BSC';

export const BSC_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(BSC_MAINNET_NETWORK_SYMBOL);

export const BSC_MAINNET_NETWORK: EthereumNetwork = {
	id: BSC_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'BNB Smart Chain',
	chainId: 56n,
	icon: bscMainnetIcon,
	explorerUrl: BSC_EXPLORER_URL,
	supportsNft: true,
	providers: {
		infura: 'bnb',
		alchemy: 'bnb',
		alchemyDeprecated: Network.BNB_MAINNET,
		alchemyJsonRpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2',
		alchemyWsUrl: 'wss://bnb-mainnet.g.alchemy.com/v2',
		viemChain: bsc
	},
	exchange: { coingeckoId: 'binance-smart-chain' },
	buy: { onramperId: 'bsc' },
	pay: { openCryptoPay: 'BinanceSmartChain' }
};

export const BSC_TESTNET_NETWORK_SYMBOL = 'BSC (Testnet)';

export const BSC_TESTNET_NETWORK_ID: NetworkId = parseNetworkId(BSC_TESTNET_NETWORK_SYMBOL);

export const BSC_TESTNET_NETWORK: EthereumNetwork = {
	id: BSC_TESTNET_NETWORK_ID,
	env: 'testnet',
	name: 'BNB Smart Chain (Testnet)',
	chainId: 97n,
	icon: bscTestnetIcon,
	explorerUrl: BSC_TESTNET_EXPLORER_URL,
	supportsNft: true,
	providers: {
		infura: 'bnbt',
		alchemy: 'bnbt',
		alchemyDeprecated: Network.BNB_TESTNET,
		alchemyJsonRpcUrl: 'https://bnb-testnet.g.alchemy.com/v2',
		alchemyWsUrl: 'wss://bnb-testnet.g.alchemy.com/v2',
		viemChain: bscTestnet
	}
};

export const SUPPORTED_BSC_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: BSC_MAINNET_ENABLED,
	mainnetNetworks: [BSC_MAINNET_NETWORK],
	testnetNetworks: [BSC_TESTNET_NETWORK]
});

export const SUPPORTED_BSC_NETWORK_IDS: NetworkId[] = SUPPORTED_BSC_NETWORKS.map(({ id }) => id);
