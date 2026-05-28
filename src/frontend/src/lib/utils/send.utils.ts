import { invalidBtcAddress } from '$btc/utils/btc-address.utils';
import type { NetworkId } from '$lib/types/network';
import type { Token } from '$lib/types/token';
import { isNullishOrEmpty } from '$lib/utils/input.utils';
import {
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	isNetworkIdSolana
} from '$lib/utils/network.utils';
import { invalidSolAddress } from '$sol/utils/sol-address.utils';
import { notEmptyString } from '@dfinity/utils';
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

export const shouldSkipDestinationStep = ({
	destination,
	token
}: {
	destination: string;
	token: Token;
}): boolean =>
	notEmptyString(destination) &&
	isNetworkIdSolana(token.network.id) &&
	!invalidSolAddress(destination);
