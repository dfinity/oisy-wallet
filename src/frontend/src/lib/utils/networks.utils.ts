import type { EthereumNetwork } from '$eth/types/network';
import { LOCAL } from '$lib/constants/app.constants';
import type { Network } from '$lib/types/network';
import type { UserNetworks } from '$lib/types/user-networks';
import { isNetworkIdEthereum, isNetworkIdEvm, isNetworkIdSolana } from '$lib/utils/network.utils';
import { isUserNetworkEnabled } from '$lib/utils/user-networks.utils';
import type { SolanaNetwork } from '$sol/types/network';
import { nonNullish } from '@dfinity/utils';

export const defineEnabledNetworks = <T extends Network>({
	$testnetsEnabled,
	$userNetworks,
	mainnetFlag,
	mainnetNetworks,
	testnetNetworks = [],
	localNetworks = []
}: {
	$testnetsEnabled: boolean;
	$userNetworks: UserNetworks;
	mainnetFlag: boolean;
	mainnetNetworks: T[];
	testnetNetworks?: T[];
	localNetworks?: T[];
}): T[] =>
	[
		...(mainnetFlag ? mainnetNetworks : []),
		...($testnetsEnabled ? [...testnetNetworks, ...(LOCAL ? localNetworks : [])] : [])
	].filter(({ id: networkId }) => isUserNetworkEnabled({ userNetworks: $userNetworks, networkId }));

export const getContractExplorerUrl = ({
	network,
	contractAddress
}: {
	network: Network;
	contractAddress: string;
}): string | undefined => {
	const baseUrl = (network as SolanaNetwork | EthereumNetwork)?.explorerUrl;
	if (nonNullish(baseUrl)) {
		if (isNetworkIdEthereum(network.id) || isNetworkIdEvm(network.id)) {
			return `${baseUrl}/address/${contractAddress}`;
		}
		if (isNetworkIdSolana(network.id)) {
			return `${baseUrl}/account/${contractAddress}`;
		}
	}
};
