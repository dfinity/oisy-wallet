import { ALCHEMY_API_KEY } from '$env/rest/alchemy.env';
import { INFURA_API_KEY } from '$env/rest/infura.env';
import type { EthersProviderNetwork } from '$eth/types/network';
import { nonNullish } from '@dfinity/utils';
import { InfuraProvider, JsonRpcProvider, Network } from 'ethers/providers';

// Single place where an EVM network becomes an ethers provider, so a chain Infura does not host
// stays a data question rather than a code path of its own.
//
// Infura reaches only the networks ethers knows by name — it builds the endpoint from that name, so
// `new InfuraProvider` throws `unknown network` before issuing a request. Such chains are read over
// their Alchemy JSON-RPC URL, which answers the same plain JSON-RPC every caller here uses; nothing
// in these providers depends on an Infura-only feature. `staticNetwork` skips the `eth_chainId`
// round-trip ethers would otherwise spend discovering the chain id we already hold.
export const ethersProvider = ({
	name,
	chainId,
	providers: { infura, alchemyJsonRpcUrl }
}: EthersProviderNetwork): JsonRpcProvider =>
	nonNullish(infura)
		? new InfuraProvider(infura, INFURA_API_KEY)
		: new JsonRpcProvider(`${alchemyJsonRpcUrl}/${ALCHEMY_API_KEY}`, new Network(name, chainId), {
				staticNetwork: true
			});
