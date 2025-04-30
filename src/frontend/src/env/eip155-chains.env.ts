import { SUPPORTED_EVM_NETWORKS } from '$env/networks/networks-evm/networks.evm.env';
import { SUPPORTED_ETHEREUM_NETWORKS } from '$env/networks/networks.eth.env';

export const EIP155_CHAINS: Record<string, { chainId: number; name: string }> = [
	...SUPPORTED_ETHEREUM_NETWORKS,
	...SUPPORTED_EVM_NETWORKS
].reduce<Record<string, { chainId: number; name: string }>>(
	(acc, { chainId, name }) => ({
		...acc,
		[`eip155:${chainId}`]: {
			chainId: Number(chainId),
			name
		}
	}),
	{}
);

export const EIP155_CHAINS_KEYS = Object.keys(EIP155_CHAINS);
