import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID,
	SUPPORTED_BITCOIN_NETWORKS
} from '$env/networks/networks.btc.env';
import type { NetworkId } from '$lib/types/network';
import { nonNullish } from '@dfinity/utils';

// CAIP-2 chain IDs for the bip122 namespace are the first 32 hex chars of each
// network's genesis block hash — https://docs.reown.com/advanced/multichain/rpc-reference/bitcoin-rpc
const BIP122_GENESIS_BLOCK_HASHES = new Map<NetworkId, string>([
	[BTC_MAINNET_NETWORK_ID, '000000000019d6689c085ae165831e93'],
	[BTC_TESTNET_NETWORK_ID, '000000000933ea01ad0ee984209779ba'],
	[BTC_REGTEST_NETWORK_ID, '0f9188f13cb7b2c71f2a335e3a4fc328']
]);

export const BIP122_CHAINS: Record<
	string,
	{ genesis: string; name: string; networkId: NetworkId }
> = SUPPORTED_BITCOIN_NETWORKS.reduce<
	Record<string, { genesis: string; name: string; networkId: NetworkId }>
>((acc, { id, name }) => {
	const genesis = BIP122_GENESIS_BLOCK_HASHES.get(id);

	return nonNullish(genesis)
		? { ...acc, [`bip122:${genesis}`]: { genesis, name, networkId: id } }
		: acc;
}, {});

const BIP122_CHAINS_KEYS = Object.keys(BIP122_CHAINS);

export const BIP122_MAINNET_CHAINS_KEYS = BIP122_CHAINS_KEYS.filter(
	(key) => BIP122_CHAINS[key].networkId === BTC_MAINNET_NETWORK_ID
);

export const BIP122_TESTNET_CHAINS_KEYS = BIP122_CHAINS_KEYS.filter(
	(key) => BIP122_CHAINS[key].networkId === BTC_TESTNET_NETWORK_ID
);

export const BIP122_REGTEST_CHAINS_KEYS = BIP122_CHAINS_KEYS.filter(
	(key) => BIP122_CHAINS[key].networkId === BTC_REGTEST_NETWORK_ID
);
