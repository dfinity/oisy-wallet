import { POLYGON_AMOY_EXPLORER_URL, POLYGON_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import polygonAmoyIcon from '$lib/assets/networks/polygon-amoy.svg';
import polygonMainnetIcon from '$lib/assets/networks/polygon-mainnet.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { Network } from 'alchemy-sdk';
import { polygon, polygonAmoy } from 'viem/chains';

export const POLYGON_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_POLYGON_MAINNET_DISABLED
);

export const POLYGON_MAINNET_NETWORK_SYMBOL = 'POL';

export const POLYGON_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(POLYGON_MAINNET_NETWORK_SYMBOL);

export const POLYGON_MAINNET_NETWORK: EthereumNetwork = {
	id: POLYGON_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Polygon',
	chainId: 137n,
	icon: polygonMainnetIcon,
	explorerUrl: POLYGON_EXPLORER_URL,
	supportsNft: true,
	providers: {
		infura: 'matic',
		alchemy: 'matic',
		alchemyDeprecated: Network.MATIC_MAINNET,
		alchemyJsonRpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2',
		alchemyWsUrl: 'wss://polygon-mainnet.g.alchemy.com/v2',
		viemChain: polygon
	},
	exchange: { coingeckoId: 'polygon-pos' },
	buy: { onramperId: 'polygon' },
	pay: { openCryptoPay: 'Polygon' }
};

export const POLYGON_AMOY_NETWORK_SYMBOL = 'POL (Amoy Testnet)';

export const POLYGON_AMOY_NETWORK_ID: NetworkId = parseNetworkId(POLYGON_AMOY_NETWORK_SYMBOL);

export const POLYGON_AMOY_NETWORK: EthereumNetwork = {
	id: POLYGON_AMOY_NETWORK_ID,
	env: 'testnet',
	name: 'Polygon (Amoy Testnet)',
	chainId: 80002n,
	icon: polygonAmoyIcon,
	explorerUrl: POLYGON_AMOY_EXPLORER_URL,
	supportsNft: true,
	providers: {
		infura: 'matic-amoy',
		alchemy: 'matic-amoy',
		alchemyDeprecated: Network.MATIC_AMOY,
		alchemyJsonRpcUrl: 'https://polygon-amoy.g.alchemy.com/v2',
		alchemyWsUrl: 'wss://polygon-amoy.g.alchemy.com/v2',
		viemChain: polygonAmoy
	}
};

export const SUPPORTED_POLYGON_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: POLYGON_MAINNET_ENABLED,
	mainnetNetworks: [POLYGON_MAINNET_NETWORK],
	testnetNetworks: [POLYGON_AMOY_NETWORK]
});

export const SUPPORTED_POLYGON_NETWORK_IDS: NetworkId[] = SUPPORTED_POLYGON_NETWORKS.map(
	({ id }) => id
);
