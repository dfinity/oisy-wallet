import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import type { EthersProviderNetwork } from '$eth/types/network';
import { nonNullish } from '@dfinity/utils';
import { InfuraProvider, JsonRpcProvider, Network } from 'ethers/providers';

// `staticNetwork` skips the `eth_chainId` round-trip ethers would otherwise spend discovering the
// chain id we already hold.
const alchemyJsonRpcProvider = ({
	name,
	chainId,
	providers: { alchemyJsonRpcUrl }
}: EthersProviderNetwork): JsonRpcProvider =>
	new JsonRpcProvider(`${alchemyJsonRpcUrl}/${ALCHEMY_API_KEY}`, new Network(name, chainId), {
		staticNetwork: true
	});

// Single place where an EVM network becomes an ethers provider, so a chain Infura does not host
// stays a data question rather than a code path of its own.
//
// Infura reaches only the networks ethers knows by name — it builds the endpoint from that name, so
// `new InfuraProvider` throws `unknown network` before issuing a request. Such chains are read over
// their Alchemy JSON-RPC URL, which answers the same plain JSON-RPC every caller here uses; nothing
// in these providers depends on an Infura-only feature.
export const ethersProvider = (network: EthersProviderNetwork): JsonRpcProvider => {
	const {
		providers: { infura }
	} = network;

	return nonNullish(infura)
		? new InfuraProvider(infura, INFURA_API_KEY)
		: alchemyJsonRpcProvider(network);
};

// The provider asked when the one above fails a call a send depends on: the same plain JSON-RPC,
// over the network's Alchemy URL. A chain Infura does not host is already read over that URL, so
// there it has no second provider and this is `undefined`.
export const ethersFallbackProvider = (
	network: EthersProviderNetwork
): JsonRpcProvider | undefined => {
	const {
		providers: { infura }
	} = network;

	return nonNullish(infura) ? alchemyJsonRpcProvider(network) : undefined;
};
