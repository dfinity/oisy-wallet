import type { NetworkId } from '$lib/types/network';
import { invalidBtcAddress } from '$lib/utils/address.utils';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import { isNetworkIdBTCRegtest, isNetworkIdBTCTestnet } from '$lib/utils/network.utils';
import { BtcNetwork } from '@icp-sdk/canisters/ckbtc';

export const isInvalidDestinationBtc = ({
	destination,
	networkId
}: {
	destination: string;
	networkId: NetworkId | undefined;
}): boolean => {
	if (isNullishOrEmpty(destination)) {
		return false;
	}

	return invalidBtcAddress({
		address: destination,
		network: isNetworkIdBTCTestnet(networkId)
			? BtcNetwork.Testnet
			: isNetworkIdBTCRegtest(networkId)
				? BtcNetwork.Regtest
				: BtcNetwork.Mainnet
	});
};
