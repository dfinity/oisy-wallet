import { ROBINHOOD_EXPLORER_URL } from '$env/explorers.env';
import type { EthereumNetwork } from '$eth/types/network';
import robinhoodMainnetIcon from '$lib/assets/networks/robinhood-mainnet.svg';
import type { NetworkId } from '$lib/types/network';
import { defineSupportedNetworks } from '$lib/utils/env.networks.utils';
import { parseEnabledMainnetBoolEnvVar } from '$lib/utils/env.utils';
import { parseNetworkId } from '$lib/validation/network.validation';
import { robinhood } from 'viem/chains';

// Robinhood Chain uses the same enablement convention as every other chain — the
// `VITE_ROBINHOOD_MAINNET_DISABLED` env var, which defaults to *enabled*.
export const ROBINHOOD_MAINNET_ENABLED = parseEnabledMainnetBoolEnvVar(
	import.meta.env.VITE_ROBINHOOD_MAINNET_DISABLED
);

export const ROBINHOOD_MAINNET_NETWORK_SYMBOL = 'RH';

export const ROBINHOOD_MAINNET_NETWORK_ID: NetworkId = parseNetworkId(
	ROBINHOOD_MAINNET_NETWORK_SYMBOL
);

// Mainnet only. The testnet (46630) has Alchemy and viem support but is absent from Etherscan's
// chainlist, so it would ship with no transaction history at all.
//
// No `infura`: Infura does not host chain 4663, so the network is read over `alchemyJsonRpcUrl`
// instead — see `ethersProvider`. No `pay`: OpenCryptoPay does not support the chain.
export const ROBINHOOD_MAINNET_NETWORK: EthereumNetwork = {
	id: ROBINHOOD_MAINNET_NETWORK_ID,
	env: 'mainnet',
	name: 'Robinhood Chain',
	chainId: 4663n,
	icon: robinhoodMainnetIcon,
	explorerUrl: ROBINHOOD_EXPLORER_URL,
	supportsNft: false,
	providers: {
		alchemy: 'robinhood-mainnet',
		alchemyJsonRpcUrl: 'https://robinhood-mainnet.g.alchemy.com/v2',
		alchemyWsUrl: 'wss://robinhood-mainnet.g.alchemy.com/v2',
		viemChain: robinhood
	},
	exchange: { coingeckoId: 'robinhood' },
	buy: { onramperId: 'robinhood' }
};

export const SUPPORTED_ROBINHOOD_NETWORKS: EthereumNetwork[] = defineSupportedNetworks({
	mainnetFlag: ROBINHOOD_MAINNET_ENABLED,
	mainnetNetworks: [ROBINHOOD_MAINNET_NETWORK]
});

export const SUPPORTED_ROBINHOOD_NETWORK_IDS: NetworkId[] = SUPPORTED_ROBINHOOD_NETWORKS.map(
	({ id }) => id
);
